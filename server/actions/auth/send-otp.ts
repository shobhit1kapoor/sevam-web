"use server";

import { prisma } from "@/lib/db/prisma";
import { normalisePhone } from "@/lib/utils/phone";
import {
  generateOtp,
  hashOtp,
  OTP_TTL_MS,
  OTP_WINDOW_MS,
  OTP_MAX_SENDS,
} from "@/lib/utils/otp";
import { sendSms } from "@/lib/utils/sms";
import { checkRateLimit, authOtpLimiter } from "@/lib/utils/rate-limit";
import { captureError } from "@/lib/utils/monitoring";
import type { ActionResult } from "@/types/auth";

/**
 * Send OTP
 *
 * 1. Validate + normalise phone (+91XXXXXXXXXX)
 * 2. Redis rate limit: max 5 sends per phone per hour (P0-B1)
 * 3. DB rate limit:   max OTP_MAX_SENDS per OTP_WINDOW_MS window
 * 4. Generate 6-digit OTP, HMAC-hash it, upsert OtpVerification
 * 5. Send SMS via Twilio (fail gracefully — return error, don't throw)
 */
export async function sendOtp(rawPhone: string): Promise<ActionResult> {
  // ── 1. Validate phone ──────────────────────────────────────────────
  let phone: string;
  try {
    phone = normalisePhone(rawPhone);
  } catch {
    return {
      ok: false,
      error: "Please enter a valid Indian mobile number (+91XXXXXXXXXX).",
      code: "INVALID_PHONE",
    };
  }

  // ── 2. Redis rate limit (P0-B1) ────────────────────────────────────
  const rl = await checkRateLimit(authOtpLimiter, phone);
  if (!rl.allowed) {
    return {
      ok: false,
      error: `Too many OTP requests. Please try again in ${rl.retryAfter} seconds.`,
      code: "RATE_LIMITED",
    };
  }

  try {
    const now = new Date();

    // ── 3. DB rate limiting ─────────────────────────────────────────
    const existing = await prisma.otpVerification.findUnique({
      where: { phone },
    });

    if (existing) {
      const windowAge = now.getTime() - existing.windowStart.getTime();
      const inWindow = windowAge < OTP_WINDOW_MS;

      if (inWindow && existing.sendCount >= OTP_MAX_SENDS) {
        const retryAfterSec = Math.ceil((OTP_WINDOW_MS - windowAge) / 1000);
        return {
          ok: false,
          error: `Too many OTP requests. Please try again in ${retryAfterSec} seconds.`,
          code: "RATE_LIMITED",
        };
      }
    }

    // ── 4. Generate & store OTP ────────────────────────────────────
    const otp = generateOtp();
    const hashedOtp = hashOtp(otp);
    const expiresAt = new Date(now.getTime() + OTP_TTL_MS);

    await prisma.otpVerification.upsert({
      where: { phone },
      create: {
        phone,
        hashedOtp,
        expiresAt,
        attempts: 0,
        sendCount: 1,
        windowStart: now,
      },
      update: {
        hashedOtp,
        expiresAt,
        attempts: 0,
        sendCount: existing
          ? existing.windowStart.getTime() + OTP_WINDOW_MS > now.getTime()
            ? { increment: 1 }
            : 1
          : 1,
        windowStart:
          existing && existing.windowStart.getTime() + OTP_WINDOW_MS > now.getTime()
            ? existing.windowStart
            : now,
      },
    });

    // ── 5. Send SMS ────────────────────────────────────────────────
    const smsResult = await sendSms(
      phone,
      `Your Sevam OTP is ${otp}. Valid for 10 minutes. Do not share this with anyone.`
    );

    if (!smsResult.ok) {
      return {
        ok: false,
        error: "Failed to send OTP. Please try again.",
        code: "SMS_FAILED",
      };
    }

    return { ok: true };
  } catch (err) {
    captureError(err, { action: "sendOtp", phone });
    return {
      ok: false,
      error: "Something went wrong. Please try again.",
      code: "SERVER_ERROR",
    };
  }
}
