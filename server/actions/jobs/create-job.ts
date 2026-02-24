"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { estimatePrice } from "@/lib/utils/pricing";
import { findNearbyWorkers } from "./find-nearby-workers";
import { sendPushToMany } from "@/lib/utils/notifications";
import type { ActionResult } from "@/types/auth";
import type { JobType } from "@/lib/generated/prisma/client";

// ─── Validation schema ────────────────────────────────────────────────────────

const JobSchema = z.object({
  type: z.enum([
    "PLUMBING", "ELECTRICAL", "PAINTING", "CARPENTRY",
    "CLEANING", "AC_REPAIR", "APPLIANCE_REPAIR", "OTHER",
  ]),
  description: z.string().min(10, "Description must be at least 10 characters").max(500),
  address: z.string().min(5, "Address is required"),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type CreateJobInput = z.infer<typeof JobSchema>;

// ─── Action ───────────────────────────────────────────────────────────────────

export async function createJob(
  input: CreateJobInput
): Promise<ActionResult<{ jobId: string; estimatedPrice: number }>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "CUSTOMER") return { ok: false, error: "Only customers can create jobs.", code: "SERVER_ERROR" };

  const parsed = JobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const { type, description, address, lat, lng } = parsed.data;

  // Estimate price (no worker location yet — use base price)
  const { total: estimatedPrice } = estimatePrice(type as JobType);

  try {
    // Create job
    const job = await prisma.job.create({
      data: {
        customerId: session.userId,
        type: type as JobType,
        description,
        address,
        lat,
        lng,
        estimatedPrice,
        status: "PENDING",
      },
    });

    // Find nearby workers and notify them (fire-and-forget)
    notifyNearbyWorkers(job.id, lat, lng, type as JobType, address).catch(
      (err) => console.error("[createJob] Notify workers failed:", err)
    );

    return { ok: true, data: { jobId: job.id, estimatedPrice } };
  } catch (err) {
    console.error("[createJob]", err);
    return { ok: false, error: "Failed to create job. Please try again.", code: "SERVER_ERROR" };
  }
}

async function notifyNearbyWorkers(
  jobId: string,
  lat: number,
  lng: number,
  type: JobType,
  address: string
) {
  const workers = await findNearbyWorkers({ lat, lng, jobType: type, radiusKm: 5, limit: 10 });
  if (!workers.length) return;

  // Collect FCM tokens (filter nulls)
  const userIds = workers.map((w) => w.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, fcmToken: { not: null } },
    select: { fcmToken: true },
  });

  const tokens = users.map((u) => u.fcmToken!).filter(Boolean);
  if (tokens.length) {
    await sendPushToMany(tokens, {
      title: "New job near you!",
      body: `${type.replace(/_/g, " ")} job at ${address}`,
      data: { jobId, type: "NEW_JOB" },
    });
  }

  // Store in-app notifications
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      jobId,
      title: "New job near you!",
      body: `${type.replace(/_/g, " ")} job at ${address}`,
    })),
  });
}
