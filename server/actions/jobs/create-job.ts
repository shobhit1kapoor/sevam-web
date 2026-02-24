"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { estimatePrice } from "@/lib/utils/pricing";
import { findNearbyWorkers } from "./find-nearby-workers";
import { sendPushToMany } from "@/lib/utils/notifications";
import { checkRateLimit, customerJobLimiter } from "@/lib/utils/rate-limit";
import { sanitizeDescription, sanitizeAddress } from "@/lib/utils/sanitize";
import { captureError } from "@/lib/utils/monitoring";
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

  // ── P0-B1: Redis rate limit — max 10 job requests per userId per hour ──
  const rl = await checkRateLimit(customerJobLimiter, session.userId);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `You've reached the job request limit. Please try again in ${rl.retryAfter} seconds.`,
      code: "RATE_LIMITED",
    };
  }

  const parsed = JobSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message, code: "SERVER_ERROR" };
  }

  const { type, lat, lng } = parsed.data;

  // ── P0-B2: Sanitize all free-text fields (XSS prevention) ─────────
  const description = sanitizeDescription(parsed.data.description);
  const address = sanitizeAddress(parsed.data.address);

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

    // Notify nearby workers
    try {
      const nearbyWorkers = await findNearbyWorkers({ lat, lng, jobType: type as JobType });
      if (nearbyWorkers.length > 0) {
        const workerUserIds = nearbyWorkers.map((w) => w.userId);
        await sendPushToMany(workerUserIds, {
          title: "New Job Available",
          body: `${type.replace("_", " ")} job near you — ₹${estimatedPrice}`,
          data: { jobId: job.id },
        });
      }
    } catch (notifyErr) {
      captureError(notifyErr, { action: "createJob:notifyWorkers", userId: session.userId, jobId: job.id });
    }

    return { ok: true, data: { jobId: job.id, estimatedPrice } };
  } catch (err) {
    captureError(err, { action: "createJob", userId: session.userId });
    return { ok: false, error: "Failed to create job. Please try again.", code: "SERVER_ERROR" };
  }
}
