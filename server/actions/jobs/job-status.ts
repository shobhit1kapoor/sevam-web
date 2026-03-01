"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { sendPushNotification } from "@/lib/utils/notifications";
import { captureError } from "@/lib/utils/monitoring";
import type { ActionResult } from "@/types/auth";
import type { JobStatus } from "@/lib/generated/prisma/client";

// ─── Validation schemas ──────────────────────────────────────────────────────

const CancelJobSchema = z.object({
  jobId:  z.string().min(1, "jobId is required"),
  reason: z.string().max(500).optional(),
});

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

/**
 * Cancel a job with an optional reason string.
 *
 * Rules:
 * - Customers can cancel PENDING or ACCEPTED jobs.
 *   Cancelling an ACCEPTED job (worker already assigned) incurs a ₹50 penalty.
 * - Workers can cancel an ACCEPTED job (they decline after accepting).
 *   The job returns to PENDING so another worker can pick it up.
 * - Admins can cancel any cancellable job.
 */
export async function cancelJob(
  jobId: string,
  reason?: string,
): Promise<ActionResult<{ penaltyApplied: boolean }>> {
  // ── Zod validation ─────────────────────────────────────────────────────────
  const parsed = CancelJobSchema.safeParse({ jobId, reason });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      worker: { select: { userId: true, user: { select: { fcmToken: true } } } },
      customer: { select: { fcmToken: true } },
    },
  });
  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };

  const { userType, userId } = session;

  // ── Authorization ──────────────────────────────────────────────────────────
  if (userType === "CUSTOMER" && job.customerId !== userId) {
    return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };
  }
  if (userType === "WORKER") {
    // Workers can only cancel jobs assigned to them in ACCEPTED state.
    const workerProfile = await prisma.workerProfile.findUnique({ where: { userId } });
    if (!workerProfile || job.workerId !== workerProfile.id) {
      return { ok: false, error: "This job is not assigned to you.", code: "SERVER_ERROR" };
    }
    if (job.status !== "ACCEPTED") {
      return { ok: false, error: "You can only cancel a job before it starts.", code: "SERVER_ERROR" };
    }
  }

  if (!canTransition(job.status, "CANCELLED")) {
    return { ok: false, error: `Cannot cancel job (status: ${job.status}).`, code: "SERVER_ERROR" };
  }

  // ── Determine cancelledBy value (maps to enum CancelledBy) ───────────────
  const cancelledBy =
    userType === "WORKER" ? "WORKER" :
    userType === "ADMIN"  ? "ADMIN"  :
    "CUSTOMER";

  // ── Penalty: customer cancels after worker is already assigned ────────────
  // A ₹50 late-cancellation fee is flagged so the billing layer can charge it.
  const penaltyApplied =
    userType === "CUSTOMER" &&
    job.status === "ACCEPTED" &&
    job.workerId !== null;

  const pendingPushes: Array<{ token: string; title: string; body: string }> = [];

  try {
    await prisma.$transaction(async (tx) => {
      if (userType === "WORKER") {
        // Worker declines → job returns to PENDING, worker assignment cleared.
        // Use updateMany with status guard to prevent stale-read race.
        const updated = await tx.job.updateMany({
          where: { id: jobId, status: "ACCEPTED", workerId: job.workerId },
          data: {
            status:     "PENDING",
            workerId:   null,
            acceptedAt: null,
          },
        });
        if (updated.count === 0) {
          throw new Error("Job is no longer in ACCEPTED state.");
        }

        // Notify customer that the worker cancelled so they know to wait for re-assignment.
        // Always create a Notification record regardless of push token.
        await tx.notification.create({
          data: {
            userId: job.customerId,
            jobId,
            title:  "Worker cancelled",
            body:   "Your assigned worker cancelled. We're finding you a new one.",
          },
        });
        if (job.customer?.fcmToken) {
          pendingPushes.push({
            token: job.customer.fcmToken,
            title: "Worker cancelled",
            body:  "Your assigned worker cancelled. We're finding you a new one.",
          });
        }
      } else {
        // Customer or admin cancels → terminal CANCELLED state.
        // Use updateMany with status guard to prevent stale-read race.
        const updated = await tx.job.updateMany({
          where: { id: jobId, status: job.status },
          data: {
            status:             "CANCELLED",
            cancelledAt:        new Date(),
            cancellationReason: reason ?? null,
            cancelledBy,
            penaltyApplied,
          },
        });
        if (updated.count === 0) {
          throw new Error("Job status has changed concurrently.");
        }

        // Notify the assigned worker (if any) that the job was cancelled.
        // Always create a Notification record regardless of push token.
        if (job.worker) {
          await tx.notification.create({
            data: {
              userId: job.worker.userId,
              jobId,
              title:  "Job cancelled",
              body:   "The customer has cancelled this job.",
            },
          });
          if (job.worker.user?.fcmToken) {
            pendingPushes.push({
              token: job.worker.user.fcmToken,
              title: "Job cancelled",
              body:  "The customer has cancelled this job.",
            });
          }
        }
      }
    });
  } catch (err) {
    captureError(err, { action: "cancelJob", jobId });
    return { ok: false, error: "Failed to cancel job. Please try again.", code: "SERVER_ERROR" };
  }

  for (const push of pendingPushes) {
    await sendPushNotification(push.token, {
      title: push.title,
      body:  push.body,
      data:  { jobId },
    }).catch((err) => {
      captureError(err, { action: "cancelJob:sendPushNotification", jobId, extra: { token: push.token } });
      return null;
    });
  }

  return { ok: true, data: { penaltyApplied } };
}
