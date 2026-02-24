// Worker-facing types
import type { JobType } from "@/lib/generated/prisma/client";

export interface WorkerStats {
  totalJobs: number;
  totalEarnings: number;
  rating: number;
  todayEarnings: number;
  weeklyEarnings: number;
}

export interface NearbyWorker {
  workerId: string;
  userId: string;
  phone: string;
  name: string | null;
  rating: number;
  totalJobs: number;
  photoUrl: string | null;
  distanceKm: number;
  lat: number;
  lng: number;
}

// Use Prisma's canonical JobType enum rather than duplicating it here.
export type SkillType = JobType;

export interface EarningsBreakdown {
  date: string;
  jobs: number;
  earnings: number;
}

export interface WorkerEarnings {
  stats: WorkerStats;
  daily: EarningsBreakdown[];
  last30DaysTotal: number;
}
