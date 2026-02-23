"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/db/supabase-server";
import type { ActionResult } from "@/types/auth";

/** B14: Update worker location
 *
 * Throttled to max 1 update per 10 seconds using `lastLocUpdateMs`.
 * If the worker has an active job, broadcasts the location update
 * over the Supabase Realtime channel `job:<jobId>`.
 */
export async function updateWorkerLocation(
  lat: number,
  lng: number
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  if (session.userType !== "WORKER") return { ok: false, error: "Not a worker.", code: "SERVER_ERROR" };

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

  // Throttle: allow at most 1 update per 10 seconds (atomic check-and-set via updateMany).
  // Including the condition in WHERE makes it race-safe — concurrent requests cannot
  // both satisfy lastLocUpdateMs <= now - THROTTLE_MS at the same instant.
  const now = BigInt(Date.now());
  const THROTTLE_MS = BigInt(10_000);

  const { count } = await prisma.workerProfile.updateMany({
    where: {
      id:              profile.id,
      lastLocUpdateMs: { lte: now - THROTTLE_MS },
    },
    data: { lat, lng, lastLocUpdate: new Date(), lastLocUpdateMs: now },
  });

  if (count === 0) {
    return { ok: true }; // throttled — not an error
  }

  // Realtime broadcast if worker has an active job
  const activeJob = profile.jobs[0];
  if (activeJob) {
    try {
      const supabase = createClient();
      // httpSend broadcasts over HTTP without requiring a WebSocket subscription,
      // which is correct for server-action (non-WS) contexts.
      // send() would require an active subscription first.
      await supabase
        .channel(`job:${activeJob.id}`)
        .httpSend("WORKER_LOCATION", { lat, lng, ts: Number(now) });
    } catch (err) {
      // Non-fatal — the DB update succeeded
      console.warn("[updateWorkerLocation] Realtime broadcast failed:", err);
    }
  }

  return { ok: true };
}

// ─── Toggle online/offline ────────────────────────────────────────────────────

export async function setWorkerOnlineStatus(isOnline: boolean): Promise<ActionResult> {
  const session = await getSession();
  if (!session || session.userType !== "WORKER") {
    return { ok: false, error: "Not authenticated.", code: "SERVER_ERROR" };
  }

  // updateMany avoids a P2025 RecordNotFound error if the profile doesn't exist yet.
  const { count } = await prisma.workerProfile.updateMany({
    where: { userId: session.userId },
    data:  { isOnline },
  });

  if (count === 0) {
    return { ok: false, error: "Worker profile not found.", code: "SERVER_ERROR" };
  }

  return { ok: true };
}
