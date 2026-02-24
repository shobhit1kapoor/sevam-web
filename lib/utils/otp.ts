import crypto from "crypto";

const OTP_LENGTH = 6;
const OTP_SECRET = (() => {
  const val = process.env.OTP_SECRET;
  if (!val) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variable: OTP_SECRET");
    }
    return "fallback-dev-secret-change-in-prod";
  }
  return val;
})();

/**
 * Generate a cryptographically random 6-digit OTP string.
 */
export function generateOtp(): string {
  // Range: 100000–999999
  const otp = crypto.randomInt(100_000, 1_000_000);
  return otp.toString();
}

/**
 * HMAC-SHA256 hash of the OTP. Store this in the DB — never the plain OTP.
 */
export function hashOtp(otp: string): string {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(otp)
    .digest("hex");
}

/**
 * Timing-safe comparison of a plain OTP against a stored hash.
 */
export function verifyOtpHash(plainOtp: string, storedHash: string): boolean {
  const incoming = Buffer.from(hashOtp(plainOtp), "hex");
  const stored = Buffer.from(storedHash, "hex");

  if (incoming.length !== stored.length) return false;
  return crypto.timingSafeEqual(incoming, stored);
}

/** OTP validity window in milliseconds (10 minutes). */
export const OTP_TTL_MS = 10 * 60 * 1000;

/** Rate-limit window in milliseconds (10 minutes). */
export const OTP_WINDOW_MS = 10 * 60 * 1000;

/** Max OTP sends per rate-limit window. */
export const OTP_MAX_SENDS = 3;

/** Max wrong-OTP attempts before the record is locked. */
export const OTP_MAX_ATTEMPTS = 3;

export { OTP_LENGTH };
