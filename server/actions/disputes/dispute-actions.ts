"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { sendPushNotification } from "@/lib/utils/notifications";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ActionResult } from "@/types/auth";

// ─── B16a: Raise a dispute ────────────────────────────────────────────────────

export async function raiseDispute(
  jobId: string,
  reason: string
): Promise<ActionResult<{ disputeId: string }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "CUSTOMER") {
    return { ok: false, error: "Only customers can raise disputes.", code: "SERVER_ERROR" };
  }

  if (!reason?.trim() || reason.trim().length < 10) {
    return { ok: false, error: "Please provide a detailed reason (min 10 characters).", code: "SERVER_ERROR" };
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return { ok: false, error: "Job not found.", code: "SERVER_ERROR" };
  if (job.customerId !== session.userId) return { ok: false, error: "Not authorised.", code: "SERVER_ERROR" };

  const allowedStatuses = ["IN_PROGRESS", "COMPLETED"] as const;
  if (!allowedStatuses.includes(job.status as typeof allowedStatuses[number])) {
    return { ok: false, error: "Disputes can only be raised for in-progress or completed jobs.", code: "SERVER_ERROR" };
  }

  // Prevent duplicate open disputes
  const existing = await prisma.jobDispute.findFirst({
    where: { jobId, status: "OPEN" },
  });
  if (existing) {
    return { ok: false, error: "A dispute is already open for this job.", code: "SERVER_ERROR" };
  }

  const transactionResult = await (async () => {
    try {
      return await prisma.$transaction([
        prisma.jobDispute.create({
          data: { jobId, raisedById: session.userId, reason: reason.trim(), status: "OPEN" },
        }),
        prisma.job.update({
          where: { id: jobId },
          data:  { status: "DISPUTED" },
        }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return null;
      }
      throw err;
    }
  })();

  if (!transactionResult) {
    return { ok: false, error: "A dispute is already open for this job.", code: "SERVER_ERROR" };
  }
  const [dispute] = transactionResult;

  // Notify admin (create in-app notification — admins can poll)
  const admins = await prisma.user.findMany({
    where: { userType: "ADMIN" },
    select: { id: true, fcmToken: true },
  });

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      jobId,
      title: "New dispute raised",
      body:  `Dispute for job ${jobId.slice(0, 8)}...`,
    })),
  });

  // Notify admins via push in parallel (fire-and-forget, non-blocking)
  await Promise.allSettled(
    admins
      .filter((a) => a.fcmToken)
      .map((admin) =>
        sendPushNotification(admin.fcmToken!, {
          title: "New dispute raised",
          body:  `Dispute for job ${jobId.slice(0, 8)}...`,
          data:  { disputeId: dispute.id },
        })
      )
  );

  return { ok: true, data: { disputeId: dispute.id } };
}

// ─── B16b: Resolve a dispute (admin) ─────────────────────────────────────────

export async function resolveDispute(
  disputeId: string,
  resolution: string
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "ADMIN") {
    return { ok: false, error: "Admin access required.", code: "SERVER_ERROR" };
  }

  if (!resolution?.trim() || resolution.trim().length < 10) {
    return { ok: false, error: "Provide a resolution note (min 10 characters).", code: "SERVER_ERROR" };
  }

  const dispute = await prisma.jobDispute.findUnique({
    where: { id: disputeId },
    include: { job: { select: { customerId: true, workerId: true } } },
  });

  if (!dispute) return { ok: false, error: "Dispute not found.", code: "SERVER_ERROR" };
  if (dispute.status !== "OPEN") return { ok: false, error: "This dispute is already resolved.", code: "SERVER_ERROR" };

  await prisma.$transaction([
    prisma.jobDispute.update({
      where: { id: disputeId },
      data: {
        status:       "RESOLVED",
        resolution:   resolution.trim(),
        resolvedAt:   new Date(),
      },
    }),
    // Move job back to COMPLETED from DISPUTED
    prisma.job.update({
      where: { id: dispute.jobId },
      data:  { status: "COMPLETED" },
    }),
  ]);

  // Notify the customer who raised it
  const customer = await prisma.user.findUnique({
    where:  { id: dispute.raisedById },
    select: { fcmToken: true },
  });

  await prisma.notification.create({
    data: {
      userId: dispute.raisedById,
      jobId:  dispute.jobId,
      title:  "Dispute resolved",
      body:   resolution.trim().slice(0, 80),
    },
  });

  if (customer?.fcmToken) {
    sendPushNotification(customer.fcmToken, {
      title: "Dispute resolved",
      body:  resolution.trim().slice(0, 80),
      data:  { disputeId },
    }).catch(console.warn);
  }

  return { ok: true };
}

// ─── List open disputes (admin) ───────────────────────────────────────────────

export async function listDisputes(
  status?: "OPEN" | "RESOLVED",
  limit?: number,
  cursor?: string
): Promise<ActionResult<{ disputes: Awaited<ReturnType<typeof fetchDisputes>> }>> {
  const session = await getSession();
  if (!session || session.userType !== "ADMIN") {
    return { ok: false, error: "Admin access required.", code: "SERVER_ERROR" };
  }

  const disputes = await fetchDisputes(status ?? "OPEN", limit, cursor);
  return { ok: true, data: { disputes } };
}

const MAX_DISPUTE_LIMIT = 100;

async function fetchDisputes(
  status: "OPEN" | "RESOLVED",
  limit = 50,
  cursor?: string
) {
  const clampedLimit = Math.max(1, Math.min(limit, MAX_DISPUTE_LIMIT));
  return prisma.jobDispute.findMany({
    where:   { status },
    include: {
      raisedBy: { select: { name: true, phone: true } },
      job:      { select: { id: true, type: true, address: true } },
    },
    orderBy: { createdAt: "desc" },
    take:    clampedLimit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });
}
