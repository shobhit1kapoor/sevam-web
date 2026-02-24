/**
 * Redis-based rate limiting using Upstash Ratelimit.
 *
 * Limits:
 *   - Auth OTP:           5  requests / phone   / hour  (slding window)
 *   - Customer jobs:      10 requests / userId  / hour
 *   - Worker location:    50 requests / userId  / hour
 *   - Session refresh:    30 requests / IP      / hour
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Single Redis client shared across all limiters
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ─── Limiter instances ────────────────────────────────────────────────────────

/** Auth: max 5 OTP requests per phone per hour */
export const authOtpLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "rl:auth:otp",
});

/** Customer: max 10 job creation requests per userId per hour */
export const customerJobLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: true,
  prefix: "rl:customer:jobs",
});

/** Worker: max 50 location updates per userId per hour */
export const workerLocationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, "1 h"),
  analytics: true,
  prefix: "rl:worker:location",
});

/** Session refresh: max 30 requests per IP per hour */
export const sessionRefreshLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 h"),
  analytics: true,
  prefix: "rl:session:refresh",
});

// ─── Helper ───────────────────────────────────────────────────────────────────

export type RateLimitCheck = {
  allowed: boolean;
  /** Seconds until limit resets — only present when blocked */
  retryAfter?: number;
};

/**
 * Check rate limit for an identifier (phone, userId, IP, etc.).
 *
 * @example
 * const check = await checkRateLimit(authOtpLimiter, phone);
 * if (!check.allowed) {
 *   return { ok: false, error: `Too many requests. Retry in ${check.retryAfter}s.`, code: "RATE_LIMITED" };
 * }
 */
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitCheck> {
  try {
    const result = await limiter.limit(identifier);
    if (!result.success) {
      return {
        allowed: false,
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      };
    }
    return { allowed: true };
  } catch (err) {
    // Fail open: if Redis is unreachable, allow the request (log the error)
    console.error("[rate-limit] Redis error, failing open:", err);
    return { allowed: true };
  }
}
