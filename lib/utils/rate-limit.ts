/**
 * Redis-based rate limiting using Upstash Ratelimit.
 *
 * Limits:
 *   - Auth OTP:           5  requests / phone   / hour  (sliding window)
 *   - Customer jobs:      10 requests / userId  / hour
 *   - Worker location:    50 requests / userId  / hour
 *   - Session refresh:    30 requests / IP      / hour
 *
 * Required env vars:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * If those env vars are absent, all limiters are null and checkRateLimit
 * fails open (allows the request) — same behaviour as a Redis outage.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Lazy Redis init — avoids crash at module load when env vars are missing ──

const _redis = (() => {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not " +
        "set — rate limiting is DISABLED. Set these env vars to enable it."
      );
    }
    return null;
  }
  return new Redis({ url, token });
})();

function makeSliding(
  tokens: number,
  window: `${number} h` | `${number} m`,
  prefix: string
): Ratelimit | null {
  if (!_redis) return null;
  return new Ratelimit({
    redis: _redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: true,
    prefix,
  });
}

// ─── Limiter instances ────────────────────────────────────────────────────────

/** Auth: max 5 OTP requests per phone per hour */
export const authOtpLimiter       = makeSliding(5,  "1 h", "rl:auth:otp");
/** Customer: max 10 job creation requests per userId per hour */
export const customerJobLimiter   = makeSliding(10, "1 h", "rl:customer:jobs");
/** Worker: max 50 location updates per userId per hour */
export const workerLocationLimiter = makeSliding(50, "1 h", "rl:worker:location");
/** Session refresh: max 30 requests per IP per hour */
export const sessionRefreshLimiter = makeSliding(30, "1 h", "rl:session:refresh");
/** Customer cart API: max 240 requests per IP per hour */
export const customerCartLimiter = makeSliding(240, "1 h", "rl:customer:cart");
/** Public location lookups: max 300 requests per IP per hour */
export const locationLookupLimiter = makeSliding(300, "1 h", "rl:location:lookup");

// ─── Helper ───────────────────────────────────────────────────────────────────

export type RateLimitCheck = {
  allowed: boolean;
  /** Seconds until limit resets — only present when blocked (always ≥ 1) */
  retryAfter?: number;
};

/**
 * Check rate limit for an identifier (phone, userId, IP, etc.).
 * Accepts a null limiter — returns allowed:true (fail-open, same as Redis
 * outage) so callers don't need to null-guard.
 *
 * @example
 * const check = await checkRateLimit(authOtpLimiter, phone);
 * if (!check.allowed) {
 *   return { ok: false, error: `Too many requests. Retry in ${check.retryAfter}s.`, code: "RATE_LIMITED" };
 * }
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitCheck> {
  if (!limiter) return { allowed: true };

  try {
    const result = await limiter.limit(identifier);
    if (!result.success) {
      return {
        allowed: false,
        // Clamp to at least 1 second so callers always get a positive value
        retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      };
    }
    return { allowed: true };
  } catch (err) {
    // Fail open: if Redis is unreachable, allow the request
    // Import dynamically to avoid a circular-dep if monitoring imports rate-limit
    try {
      const { captureError } = await import("@/lib/utils/monitoring");
      captureError(err, { action: "checkRateLimit", extra: { identifier: identifier.slice(0, 6) + "***" } });
    } catch {
      console.error("[rate-limit] Redis error (and Sentry unavailable), failing open:", err);
    }
    return { allowed: true };
  }
}
