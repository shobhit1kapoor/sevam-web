import { prisma } from "@/lib/db/prisma";
import { haversineKm, boundingBox } from "@/lib/utils/geo";
import type { JobType } from "@/lib/generated/prisma/client";
import type { NearbyWorker } from "@/types/worker";

interface FindNearbyWorkersInput {
  lat: number;
  lng: number;
  jobType?: JobType;
  radiusKm?: number;
  limit?: number;
}

/**
 * B9 — Find the best nearby workers for a job.
 *
 * Algorithm:
 * 1. Bounding-box pre-filter on worker lat/lng (avoids full table scan)
 * 2. Filter: isOnline=true, isApproved=true, no active job, matches skill
 * 3. Compute exact Haversine distances in JS
 * 4. Rank by: distance (40%), rating (40%), totalJobs (20%)
 * 5. Return top `limit` matches
 */
export async function findNearbyWorkers(
  input: FindNearbyWorkersInput
): Promise<NearbyWorker[]> {
  const { lat, lng, jobType, radiusKm: rawRadius = 5, limit: rawLimit = 5 } = input;
  // Clamp to prevent divide-by-zero in scoring and overly large queries.
  const radiusKm = Math.max(0.1, Math.min(rawRadius, 200));
  const limit    = Math.max(1,   Math.min(rawLimit,   50));

  const box = boundingBox(lat, lng, radiusKm);

  // First do a cheap bounding-box pass to get candidate IDs
  const candidateProfiles = await prisma.workerProfile.findMany({
    where: {
      isOnline: true,
      isApproved: true,
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
      ...(jobType ? { skills: { has: jobType } } : {}),
    },
    select: { id: true },
  });
  const candidateIds = candidateProfiles.map((p) => p.id);

  // Find workers with active jobs — scoped to candidates only (avoids full table scan)
  const busyWorkers = await prisma.job.findMany({
    where: { status: { in: ["ACCEPTED", "IN_PROGRESS"] }, workerId: { in: candidateIds } },
    select: { workerId: true },
  });
  const busyIds = new Set(busyWorkers.map((j) => j.workerId).filter(Boolean) as string[]);

  // Fetch full candidate data (re-uses the same bounding box filter)
  const candidates = await prisma.workerProfile.findMany({
    where: {
      id: { in: candidateIds },
    },
    include: {
      user: { select: { id: true, phone: true, name: true } },
    },
  });

  // Exact distance + exclude busy workers + require known location
  const withDistance = candidates
    .filter((w) => !busyIds.has(w.id))
    .filter((w) => w.lat != null && w.lng != null)
    .map((w) => ({
      worker: w,
      distanceKm: haversineKm(lat, lng, w.lat!, w.lng!),
    }))
    .filter(({ distanceKm }) => distanceKm <= radiusKm);

  // Score: lower is better
  const scored = withDistance.map(({ worker: w, distanceKm }) => {
    const distScore  = distanceKm / radiusKm;                   // 0–1
    const ratingScore = 1 - (w.rating / 5);                     // 0–1, lower rating = worse
    const jobScore   = 1 - Math.min(w.totalJobs / 100, 1);      // 0–1, more jobs = more experienced = lower score
    const score = distScore * 0.4 + ratingScore * 0.4 + jobScore * 0.2;
    return { w, distanceKm, score };
  });

  scored.sort((a, b) => a.score - b.score);

  return scored.slice(0, limit).map(({ w, distanceKm }) => ({
    workerId:   w.id,
    userId:     w.user.id,
    phone:      w.user.phone,
    name:       w.user.name,
    rating:     w.rating,
    totalJobs:  w.totalJobs,
    photoUrl:   w.photoUrl,
    distanceKm,
    // w.lat / w.lng are guaranteed non-null by the .filter(w => w.lat != null) above.
    lat:        w.lat!,
    lng:        w.lng!,
  }));
}
