"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { sendPushNotification } from "@/lib/utils/notifications";
import type { ActionResult } from "@/types/auth";
import type { JobStatus } from "@/lib/generated/prisma/client";

// ─── State machine ────────────────────────────────────────────────────────────
//  PENDING → ACCEPTED → IN_PROGRESS → COMPLETED
//  PENDING / ACCEPTED → CANCELLED (by customer or admin)
//  IN_PROGRESS → DISPUTED
//  COMPLETED → DISPUTED

const VALID_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> = {
  PENDING:     ["ACCEPTED", "CANCELLED"],
  ACCEPTED:    ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED:   ["DISPUTED"],
};

function canTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Notify customer helper ───────────────────────────────────────────────────

async function notifyCustomer(
  customerId: string,
  jobId: string,
  title: string,
  body: string
) {
  // Non-critical: notification failures must never break the calling job flow.
  try {
    const customer = await prisma.user.findUnique({
      where: { id: customerId },
      select: { fcmToken: true },
    });
    await prisma.notification.create({ data: { userId: customerId, jobId, title, body } });
    if (customer?.fcmToken) {
      await sendPushNotification(customer.fcmToken, { title, body, data: { jobId } });
    }
  } catch {
    console.error("[notifyCustomer] Non-critical notification failure for job", jobId);
  }
}

// ─── B10a: Accept job ─────────────────────────────────────────────────────────

export async function acceptJob(jobId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "WORKER") return { ok: false, error: "Only workers can accept jobs.", code: "SERVER_ERROR" };

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!workerProfile) return { ok: false, error: "Worker profile not found.", code: "SERVER_ERROR" };
  if (!workerProfile.isApproved) return { ok: false, error: "Your profile is pending approval.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { customerId: true, status: true } });
  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.status !== "PENDING") {
    return { ok: false, error: `Job cannot be accepted (current status: ${job.status}).`, code: "SERVER_ERROR" };
  }

  // Atomic accept: only succeeds if the job is still PENDING with no worker assigned.
  // Prevents the race condition where two workers both pass the findUnique check
  // and the last update silently overwrites the first worker assignment.
  const updated = await prisma.job.updateMany({
    where: { id: jobId, status: "PENDING", workerId: null },
    data:  { status: "ACCEPTED", workerId: workerProfile.id, acceptedAt: new Date() },
  });

  if (updated.count === 0) {
    return { ok: false, error: "Job is no longer available.", code: "SERVER_ERROR" };
  }

  await notifyCustomer(job.customerId, jobId, "Worker assigned!", "Your worker is on the way.");
  return { ok: true };
}

// ─── B10b: Start job ──────────────────────────────────────────────────────────

export async function startJob(jobId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const workerProfile = await prisma.workerProfile.findUnique({ where: { userId: session.userId } });
  if (!workerProfile) return { ok: false, error: "Worker profile not found.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.workerId !== workerProfile.id) return { ok: false, error: "This job is not assigned to you.", code: "SERVER_ERROR" };
  if (!canTransition(job.status, "IN_PROGRESS")) {
    return { ok: false, error: `Cannot start job (status: ${job.status}).`, code: "SERVER_ERROR" };
  }

  // Atomic update — include status in WHERE to prevent a double-start race condition.
  const updated = await prisma.job.updateMany({
    where: { id: jobId, workerId: workerProfile.id, status: job.status },
    data:  { status: "IN_PROGRESS", startedAt: new Date() },
  });
  if (updated.count === 0) {
    return { ok: false, error: `Cannot start job (status: ${job.status}).`, code: "SERVER_ERROR" };
  }

  await notifyCustomer(job.customerId, jobId, "Work started!", "Your worker has started the job.");
  return { ok: true };
}

// ─── B10c: Complete job ───────────────────────────────────────────────────────

export async function completeJob(
  jobId: string,
  afterPhotoUrl?: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const workerProfile = await prisma.workerProfile.findUnique({ where: { userId: session.userId } });
  if (!workerProfile) return { ok: false, error: "Worker profile not found.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.workerId !== workerProfile.id) return { ok: false, error: "This job is not assigned to you.", code: "SERVER_ERROR" };
  if (!canTransition(job.status, "COMPLETED")) {
    return { ok: false, error: `Cannot complete job (status: ${job.status}).`, code: "SERVER_ERROR" };
  }

  const now = new Date();

  // Atomic: include job ownership + status in the WHERE clause so a concurrent
  // second completion cannot increment totalJobs/totalEarnings twice.
  await prisma.$transaction(async (tx) => {
    const updated = await tx.job.updateMany({
      where: { id: jobId, workerId: workerProfile.id, status: job.status },
      data: {
        status: "COMPLETED",
        completedAt: now,
        finalPrice: job.estimatedPrice,
        ...(afterPhotoUrl ? { afterPhotoUrl } : {}),
      },
    });
    if (updated.count === 0) return; // already completed by a concurrent request

    await tx.workerProfile.update({
      where: { id: workerProfile.id },
      data: {
        totalJobs:     { increment: 1 },
        totalEarnings: { increment: job.estimatedPrice },
      },
    });
    await tx.payment.upsert({
      where:  { jobId },
      create: { jobId, amount: job.estimatedPrice, status: "PENDING" },
      update: {},
    });
  });

  await notifyCustomer(
    job.customerId,
    jobId,
    "Job completed! 🎉",
    `Your job is done. Please pay ₹${job.estimatedPrice}.`
  );

  return { ok: true };
}

// ─── Cancel job ───────────────────────────────────────────────────────────────

export async function cancelJob(jobId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };

  // Customers can only cancel their own jobs; admins can cancel any job.
  if (session.userType === "CUSTOMER" && job.customerId !== session.userId) {
    return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };
  }
  if (session.userType === "WORKER") {
    return { ok: false, error: "Workers cannot cancel jobs.", code: "SERVER_ERROR" };
  }

  if (!canTransition(job.status, "CANCELLED")) {
    return { ok: false, error: `Cannot cancel job (status: ${job.status}).`, code: "SERVER_ERROR" };
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  return { ok: true };
}
