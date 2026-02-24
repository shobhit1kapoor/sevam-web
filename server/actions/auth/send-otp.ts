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
import type { ActionResult } from "@/types/auth";

/**
 * B5 – Send OTP
 *
 * 1. Validate + normalise phone (+91XXXXXXXXXX)
 * 2. Rate limit: max 3 sends per 10-minute window
 * 3. Generate 6-digit OTP, HMAC-hash it, upsert OtpVerification
 * 4. Send SMS via Twilio (fail gracefully — return error, don't throw)
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

  try {
    const now = new Date();

    // ── 2. Rate limiting ────────────────────────────────────────────
    const existing = await prisma.otpVerification.findUnique({
      where: { phone },
    });

    if (existing) {
      const windowAge = now.getTime() - existing.windowStart.getTime();
      const inWindow = windowAge < OTP_WINDOW_MS;

      if (inWindow && existing.sendCount >= OTP_MAX_SENDS) {
        const retryAfterSec = Math.ceil(
          (OTP_WINDOW_MS - windowAge) / 1000
        );
        return {
          ok: false,
          error: `Too many OTP requests. Please try again in ${retryAfterSec} seconds.`,
          code: "RATE_LIMITED",
        };
      }
    }

    // ── 3. Generate & store OTP ────────────────────────────────────
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
        // If we're inside the same window, increment; otherwise reset.
        sendCount: existing
          ? now.getTime() - existing.windowStart.getTime() < OTP_WINDOW_MS
            ? { increment: 1 }
            : 1
          : 1,
        windowStart: existing
          ? now.getTime() - existing.windowStart.getTime() < OTP_WINDOW_MS
            ? existing.windowStart
            : now
          : now,
      },
    });

    // ── 4. Send SMS ────────────────────────────────────────────────
    const smsResult = await sendSms(
      phone,
      `Your Sevam verification code is ${otp}. Valid for 10 minutes. Do not share this code.`
    );

    if (!smsResult.ok) {
      // Roll back the OTP record so the user can retry immediately.
      await prisma.otpVerification
        .delete({ where: { phone } })
        .catch(() => {/* ignore if already gone */});

      return {
        ok: false,
        error: "Failed to send OTP. Please try again.",
        code: "SMS_FAILED",
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("[sendOtp] Unexpected error:", err);
    return {
      ok: false,
      error: "Something went wrong. Please try again.",
      code: "SERVER_ERROR",
    };
  }
}
