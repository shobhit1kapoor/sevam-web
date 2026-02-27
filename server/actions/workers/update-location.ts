"use server";

import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/db/supabase-server";
import { checkRateLimit, workerLocationLimiter } from "@/lib/utils/rate-limit";
import { captureError } from "@/lib/utils/monitoring";
import type { ActionResult } from "@/types/auth";

// ─── Validation ───────────────────────────────────────────────────────────────

const LocationSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
});

// ─── updateWorkerLocation ─────────────────────────────────────────────────────

/**
 * Update worker location.
 *
 * - Zod validation: finite lat/lng within bounds.
 * - P0-B1: Redis rate limit — max 50 updates per worker per hour.
 * - DB throttle: max 1 update per 10 s (race-safe via updateMany WHERE).
 * - Broadcasts location over Supabase Realtime if worker has an active job.
 */
export async function updateWorkerLocation(
  lat: number,
  lng: number
): Promise<ActionResult> {
  const session = await getSession();
  if (!session)
    return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "WORKER")
    return { ok: false, error: "Not a worker.", code: "SERVER_ERROR" };

  // ── Input validation ───────────────────────────────────────────────
  const parsed = LocationSchema.safeParse({ lat, lng });
  if (!parsed.success) {
    return { ok: false, error: "Invalid coordinates.", code: "SERVER_ERROR" };
  }

  // ── P0-B1: Redis rate limit — max 50 location updates per worker per hour ──
  const rl = await checkRateLimit(workerLocationLimiter, session.userId);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `Location update limit reached. Retry in ${rl.retryAfter} seconds.`,
      code: "RATE_LIMITED",
    };
  }

  try {
    const profile = await prisma.workerProfile.findUnique({
      where:   { userId: session.userId },
      include: {
        jobs: {
          where:  { status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
          select: { id: true },
          take:   1,
        },
      },
    });

    if (!profile)
      return { ok: false, error: "Worker profile not found.", code: "SERVER_ERROR" };

    const now        = BigInt(Date.now());
    const THROTTLE_MS = BigInt(10_000);

    const { count } = await prisma.workerProfile.updateMany({
      where: { id: profile.id, lastLocUpdateMs: { lte: now - THROTTLE_MS } },
      data:  { lat: parsed.data.lat, lng: parsed.data.lng, lastLocUpdateMs: now },
    });

    if (count === 0) return { ok: true }; // throttled — not an error

    const activeJob = profile.jobs[0];
    if (activeJob) {
      try {
        const supabase = createClient();
        await supabase.channel(`job:${activeJob.id}`).send({
          type:    "broadcast",
          event:   "WORKER_LOCATION", // must match customer TrackingMap subscription
          payload: { lat: parsed.data.lat, lng: parsed.data.lng, ts: Date.now() },
        });
      } catch (broadcastErr) {
        captureError(broadcastErr, {
          action: "updateWorkerLocation:broadcast",
          userId: session.userId,
          jobId:  activeJob.id,
        });
      }
    }

    return { ok: true };
  } catch (err) {
    captureError(err, { action: "updateWorkerLocation", userId: session.userId });
    return { ok: false, error: "Failed to update location.", code: "SERVER_ERROR" };
  }
}

// ─── setWorkerOnlineStatus ────────────────────────────────────────────────────

/**
 * Toggle a worker's online/offline status.
 * Used by the worker dashboard header toggle.
 */
const OnlineStatusSchema = z.object({ isOnline: z.boolean() });

export async function setWorkerOnlineStatus(isOnline: boolean): Promise<ActionResult> {
  // Runtime Zod validation — TypeScript types alone are insufficient for server-action input
  const parsed = OnlineStatusSchema.safeParse({ isOnline });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input.", code: "SERVER_ERROR" };
  }

  const session = await getSession();
  if (!session || session.userType !== "WORKER") {
    return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  }

  try {
    // updateMany avoids a P2025 RecordNotFound error if the profile doesn't exist yet.
    const { count } = await prisma.workerProfile.updateMany({
      where: { userId: session.userId },
      data:  { isOnline: parsed.data.isOnline },
    });

    if (count === 0) {
      return { ok: false, error: "Worker profile not found.", code: "SERVER_ERROR" };
    }

    return { ok: true };
  } catch (err) {
    captureError(err, { action: "setWorkerOnlineStatus", userId: session.userId });
    return { ok: false, error: "Failed to update online status.", code: "SERVER_ERROR" };
  }
}
