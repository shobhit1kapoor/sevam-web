import type { JobType } from "@/lib/generated/prisma/client";
import type { PriceEstimate } from "@/types/job";

// ─── Base prices (INR) ────────────────────────────────────────────────────────

const BASE_PRICE: Record<JobType, number> = {
  PLUMBING:         400,
  ELECTRICAL:       450,
  PAINTING:         800,
  CARPENTRY:        600,
  CLEANING:         350,
  AC_REPAIR:        700,
  APPLIANCE_REPAIR: 500,
  OTHER:            300,
};

/** Distance surcharge: ₹10 per km beyond 2 km */
const SURCHARGE_PER_KM = 10;
const FREE_KM = 2;

/**
 * Calculate an estimated job price.
 *
 * @param type       Job type
 * @param distanceKm Distance from worker/hub to job location (optional)
 */
export function estimatePrice(
  type: JobType,
  distanceKm = 0
): PriceEstimate {
  const base = BASE_PRICE[type];
  const chargeableKm = Math.max(0, distanceKm - FREE_KM);
  const surcharge = Math.round(chargeableKm * SURCHARGE_PER_KM);

  return {
    base,
    distanceSurcharge: surcharge,
    total: base + surcharge,
    currency: "INR",
  };
}

/** Format a price as "₹1,200" */
export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
