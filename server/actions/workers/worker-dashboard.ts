"use server";

import { prisma } from "@/lib/db/prisma";
import { getSession } from "@/lib/auth/session";
import type { ActionResult } from "@/types/auth";
import type { JobSummary } from "@/types/job";
import type { WorkerStats, WorkerEarnings, EarningsBreakdown } from "@/types/worker";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  // Use UTC to match toISOString()-based bucketing and avoid day-shift on non-UTC servers.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── B13a: Get jobs available to the worker + their assigned jobs ─────────────

export async function getWorkerJobs(): Promise<ActionResult<{
  available: JobSummary[];
  active: JobSummary[];
  completed: JobSummary[];
}>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "UNAUTHORIZED" };

  const workerProfile = await prisma.workerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!workerProfile) return { ok: false, error: "Worker profile not found.", code: "NOT_FOUND" };

  const [availableJobs, assignedJobs] = await prisma.$transaction([
    // Available: PENDING jobs matching worker skills (public queue)
    prisma.job.findMany({
      where: {
        status:  "PENDING",
        workerId: null,
        type:    { in: workerProfile.skills as import("@/lib/generated/prisma/client").JobType[] },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    // Assigned to this worker
    prisma.job.findMany({
      where: { workerId: workerProfile.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const toSummary = (j: (typeof assignedJobs)[0]): JobSummary => ({
    id:             j.id,
    type:           j.type,
    status:         j.status,
    address:        j.address,
    estimatedPrice: Number(j.estimatedPrice),
    finalPrice:     j.finalPrice !== null ? Number(j.finalPrice) : null,
    createdAt:      j.createdAt,
    worker:         null,
  });

  const active    = assignedJobs.filter((j) => ["ACCEPTED","IN_PROGRESS"].includes(j.status)).map(toSummary);
  const completed = assignedJobs.filter((j) => j.status === "COMPLETED").map(toSummary);
  const available = availableJobs.map(toSummary);

  return { ok: true, data: { available, active, completed } };
}

// ─── B13b: Earnings breakdown ─────────────────────────────────────────────────

export async function getWorkerEarnings(): Promise<ActionResult<WorkerEarnings>> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Not authenticated.", code: "UNAUTHORIZED" };

  const profile = await prisma.workerProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) return { ok: false, error: "Worker profile not found.", code: "NOT_FOUND" };

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const completedJobs = await prisma.job.findMany({
    where: {
      workerId:    profile.id,
      status:      "COMPLETED",
      completedAt: { gte: thirtyDaysAgo },
    },
    orderBy: { completedAt: "asc" },
    select: { id: true, completedAt: true, finalPrice: true, estimatedPrice: true },
  });

  // Group by day
  const byDay = new Map<string, EarningsBreakdown>();
  let totalLast30 = 0;

  for (const job of completedJobs) {
    const dayKey = formatDate(startOfDay(job.completedAt!));
    const amount = Number(job.finalPrice ?? job.estimatedPrice);
    totalLast30 += amount;

    if (!byDay.has(dayKey)) {
      byDay.set(dayKey, { date: dayKey, jobs: 0, earnings: 0 });
    }
    const entry = byDay.get(dayKey)!;
    entry.jobs     += 1;
    entry.earnings += amount;
  }

  // Last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekJobs = completedJobs.filter((j) => j.completedAt! >= sevenDaysAgo);
  const weeklyTotal = weekJobs.reduce((sum, j) => sum + Number(j.finalPrice ?? j.estimatedPrice), 0);

  const stats: WorkerStats = {
    totalEarnings:  Number(profile.totalEarnings),
    totalJobs:     profile.totalJobs,
    rating:        profile.rating,
    weeklyEarnings: weeklyTotal,
    todayEarnings:  byDay.get(formatDate(startOfDay(new Date())))?.earnings ?? 0,
  };

  return {
    ok: true,
    data: {
      stats,
      daily:        Array.from(byDay.values()),
      last30DaysTotal: totalLast30,
    },
  };
}
