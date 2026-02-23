"use server";

import { prisma } from "@/lib/db/prisma";
import { normalisePhone } from "@/lib/utils/phone";
import { verifyOtpHash, OTP_MAX_ATTEMPTS } from "@/lib/utils/otp";
import { setSessionCookies } from "@/lib/auth/session";
import type { ActionResult, SessionPayload, UserType } from "@/types/auth";

/**
 * B6 – Verify OTP
 *
 * 1. Validate + normalise phone
 * 2. Find OtpVerification; check expiration and lock status
 * 3. Compare hashed OTP (timing-safe); increment or clear attempts
 * 4. On success: upsert User, delete OTP record, set session cookies
 * 5. Return session payload to client
 */
export async function verifyOtp(
  rawPhone: string,
  plainOtp: string
): Promise<ActionResult<SessionPayload>> {
  // ── 1. Validate phone ──────────────────────────────────────────────
  let phone: string;
  try {
    phone = normalisePhone(rawPhone);
  } catch {
    return {
      ok: false,
      error: "Invalid phone number.",
      code: "INVALID_PHONE",
    };
  }

  // Basic OTP format guard
  if (!/^\d{6}$/.test(plainOtp.trim())) {
    return {
      ok: false,
      error: "OTP must be a 6-digit number.",
      code: "OTP_INVALID",
    };
  }

  try {
    // ── 2. Fetch OTP record ────────────────────────────────────────
    const record = await prisma.otpVerification.findUnique({
      where: { phone },
    });

    if (!record) {
      return {
        ok: false,
        error: "No OTP found for this number. Please request a new one.",
        code: "OTP_NOT_FOUND",
      };
    }

    // Check expiration
    if (record.expiresAt < new Date()) {
      await prisma.otpVerification.delete({ where: { phone } }).catch((err: unknown) => {
        console.error("[verifyOtp] Failed to delete expired OTP record:", err instanceof Error ? err.message : "unknown");
      });
      return {
        ok: false,
        error: "OTP has expired. Please request a new one.",
        code: "OTP_EXPIRED",
      };
    }

    // Check lock
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.otpVerification.delete({ where: { phone } }).catch((err: unknown) => {
        console.error("[verifyOtp] Failed to delete locked OTP record:", err instanceof Error ? err.message : "unknown");
      });
      return {
        ok: false,
        error:
          "Too many incorrect attempts. Please request a new OTP.",
        code: "OTP_LOCKED",
      };
    }

    // ── 3. Verify OTP ──────────────────────────────────────────────
    const isValid = verifyOtpHash(plainOtp.trim(), record.hashedOtp);

    if (!isValid) {
      const newAttempts = record.attempts + 1;
      const remaining = OTP_MAX_ATTEMPTS - newAttempts;

      await prisma.otpVerification.update({
        where: { phone },
        data: { attempts: newAttempts },
      });

      if (remaining <= 0) {
        await prisma.otpVerification.delete({ where: { phone } }).catch((err: unknown) => {
          console.error("[verifyOtp] Failed to delete OTP after max attempts:", err instanceof Error ? err.message : "unknown");
        });
        return {
          ok: false,
          error:
            "Too many incorrect attempts. Please request a new OTP.",
          code: "OTP_LOCKED",
        };
      }

      return {
        ok: false,
        error: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
        code: "OTP_INVALID",
      };
    }

    // ── 4. Create / fetch User, delete OTP record ──────────────────
    const [user] = await prisma.$transaction([
      prisma.user.upsert({
        where: { phone },
        create: { phone, userType: "CUSTOMER" },
        update: {},
        select: { id: true, phone: true, userType: true },
      }),
      prisma.otpVerification.delete({ where: { phone } }),
    ]);

    // ── 5. Mint session + set cookies + audit log ──────────────────────
    // Defensive: ensure the DB value is a recognised UserType before casting.
    if (!["CUSTOMER", "WORKER", "ADMIN"].includes(user.userType)) {
      return { ok: false, error: "Invalid account type.", code: "SERVER_ERROR" };
    }
    const sessionPayload: SessionPayload = {
      userId: user.id,
      phone: user.phone,
      userType: user.userType as UserType,
    };

    await setSessionCookies(sessionPayload);

    console.info(
      JSON.stringify({
        audit: "login",
        userId: user.id,
        userType: user.userType,
        timestamp: new Date().toISOString(),
      })
    );

    return { ok: true, data: sessionPayload };
  } catch (err) {
    console.error("[verifyOtp] Unexpected error:", err);
    return {
      ok: false,
      error: "Something went wrong. Please try again.",
      code: "SERVER_ERROR",
    };
  }
}
