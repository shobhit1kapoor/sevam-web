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

// ─── Surge / time-based multipliers ─────────────────────────────────────────

/**
 * Surge slots expressed as IST hour ranges → multiplier.
 * Evaluated at request time using the caller's wall clock.
 */
const SURGE_SLOTS: Array<{
  startHour: number;
  endHour: number;
  multiplier: number;
  label: string;
}> = [
  // Peak morning demand: 7 am – 10 am IST
  { startHour: 7,  endHour: 10, multiplier: 1.2,  label: "Morning surge" },
  // Peak evening demand: 5 pm – 9 pm IST
  { startHour: 17, endHour: 21, multiplier: 1.25, label: "Evening surge" },
  // Late-night/emergency: 10 pm – midnight IST
  { startHour: 22, endHour: 24, multiplier: 1.5,  label: "Night emergency" },
  // Overnight: midnight – 6 am IST
  { startHour: 0,  endHour: 6,  multiplier: 1.5,  label: "Night emergency" },
];

/** Return 1.0 during normal hours; higher during surge windows. */
function getSurgeMultiplier(now: Date = new Date()): {
  multiplier: number;
  label: string | null;
} {
  // Convert UTC epoch to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate   = new Date(now.getTime() + istOffset);
  const hour = istDate.getUTCHours();
  const day  = istDate.getUTCDay(); // 0=Sun, 6=Sat

  const isWeekend = day === 0 || day === 6;
  const slot = SURGE_SLOTS.find((s) => hour >= s.startHour && hour < s.endHour);

  const timeMult  = slot?.multiplier ?? 1.0;
  const timeLabel = slot?.label      ?? null;
  // Weekend adds a flat +15 % on top of any time multiplier
  const weekendAdder = isWeekend ? 0.15 : 0;
  const finalMult    = timeMult + weekendAdder;

  const finalLabel =
    isWeekend && timeLabel ? `${timeLabel} + weekend` :
    isWeekend              ? "Weekend rate" :
    timeLabel;

  return { multiplier: finalMult, label: finalLabel ?? null };
}

// ─── Worker rating premium ────────────────────────────────────────────────────

/**
 * Workers rated ≥ 4.5 attract a +8 % premium.
 * Workers rated < 3.5 (and > 0) receive a -5 % discount to retain demand.
 */
function getWorkerRatingMultiplier(rating: number): number {
  if (rating >= 4.5) return 1.08;
  if (rating < 3.5 && rating > 0) return 0.95;
  return 1.0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface PriceEstimateV2 extends PriceEstimate {
  surgeMultiplier: number;
  surgeLabel: string | null;
  workerRatingMultiplier: number;
  /** Human-readable breakdown string for logging / UI tooltips. */
  breakdown: string;
}

/**
 * V2 price estimator with distance surcharge, time-of-day surge,
 * weekend premium, and worker-rating adjustment.
 *
 * @param type          Job type
 * @param distanceKm    Distance to job location (defaults to 0)
 * @param workerRating  Worker's current rating; 0 = unrated / not yet assigned
 * @param now           Override wall clock (useful for unit tests)
 */
export function estimatePrice(
  type: JobType,
  distanceKm = 0,
  workerRating = 0,
  now?: Date,
): PriceEstimateV2 {
  const base = BASE_PRICE[type];
  const chargeableKm     = Math.max(0, distanceKm - FREE_KM);
  const distanceSurcharge = Math.round(chargeableKm * SURCHARGE_PER_KM);

  const { multiplier: surgeMult,  label: surgeLabel  } = getSurgeMultiplier(now);
  const ratingMult = getWorkerRatingMultiplier(workerRating);

  // Surge + rating multipliers apply to the base fee only, not distance.
  const adjustedBase = Math.round(base * surgeMult * ratingMult);
  const total        = adjustedBase + distanceSurcharge;

  const parts: string[] = [`Base ₹${base}`];
  if (surgeMult !== 1)    parts.push(`${surgeLabel ?? "surge"} ×${surgeMult.toFixed(2)}`);
  if (ratingMult !== 1)   parts.push(`rating adj ×${ratingMult.toFixed(2)}`);
  if (distanceSurcharge)  parts.push(`distance +₹${distanceSurcharge}`);

  return {
    base:                   adjustedBase,
    distanceSurcharge,
    total,
    currency:               "INR",
    surgeMultiplier:        surgeMult,
    surgeLabel,
    workerRatingMultiplier: ratingMult,
    breakdown:              parts.join(" → "),
  };
}

/** Format a price as "₹1,200". */
export function formatPrice(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/** Return the current surge label string for UI badge display (null = normal rate). */
export function getCurrentSurgeLabel(): string | null {
  return getSurgeMultiplier().label;
}
