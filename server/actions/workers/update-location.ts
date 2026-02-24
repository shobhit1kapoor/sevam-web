"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/db/supabase-server";
import { checkRateLimit, workerLocationLimiter } from "@/lib/utils/rate-limit";
import { captureError } from "@/lib/utils/monitoring";
import type { ActionResult } from "@/types/auth";

/**
 * Update worker location
 *
 * - P0-B1: Redis rate limit — max 50 location updates per worker per hour.
 * - DB throttle: max 1 update per 10 seconds (race-safe via updateMany WHERE).
 * - Broadcasts location over Supabase Realtime if worker has an active job.
 */
export async function updateWorkerLocation(
  lat: number,
  lng: number
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "WORKER") return { ok: false, error: "Not a worker.", code: "SERVER_ERROR" };

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
      where: { userId: session.userId },
      include: {
        jobs: {
          where: { status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!profile) return { ok: false, error: "Worker profile not found.", code: "SERVER_ERROR" };

    const now = BigInt(Date.now());
    const THROTTLE_MS = BigInt(10_000);

    const { count } = await prisma.workerProfile.updateMany({
      where: {
        id:              profile.id,
        lastLocUpdateMs: { lte: now - THROTTLE_MS },
      },
      data: { lat, lng, lastLocUpdateMs: now },
    });

    if (count === 0) {
      return { ok: true };
    }

    const activeJob = profile.jobs[0];
    if (activeJob) {
      try {
        const supabase = createClient();
        await supabase.channel(`job:${activeJob.id}`).send({
          type: "broadcast",
          event: "location",
          payload: { lat, lng, ts: Date.now() },
        });
      } catch (broadcastErr) {
        captureError(broadcastErr, {
          action: "updateWorkerLocation:broadcast",
          userId: session.userId,
          jobId: activeJob.id,
        });
      }
    }

    return { ok: true };
  } catch (err) {
    captureError(err, { action: "updateWorkerLocation", userId: session.userId });
    return { ok: false, error: "Failed to update location.", code: "SERVER_ERROR" };
  }
}
