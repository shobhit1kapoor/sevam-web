import { NextRequest, NextResponse } from "next/server";
import { mintAccessToken, mintRefreshToken, verifyRefreshToken } from "@/lib/auth/session";
import { checkRateLimit, sessionRefreshLimiter } from "@/lib/utils/rate-limit";
import { captureCritical } from "@/lib/utils/monitoring";
import type { SessionPayload, UserType } from "@/types/auth";

/**
 * POST /api/auth/session-refresh
 *
 * Called internally by the middleware (edge) to refresh a session.
 * - P0-B1: Rate limited to 30 refresh attempts per IP per hour.
 *          Falls back to a per-userId bucket when IP is not available,
 *          preventing a shared global bucket across all clients.
 * - P0-B3: Critical errors are captured by Sentry.
 */
export async function POST(req: NextRequest) {
  // ── P0-B1: Rate limit per IP (fallback: per userId from refresh token) ────
  //
  // Prefer IP so each device is bucketed independently.
  // When IP is indeterminate (direct internal calls without a proxy), fall back
  // to the userId extracted from the refresh token — prevents a shared global
  // "unknown" bucket while still protecting per-user refresh rate.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  // Verify the refresh token early so we can use the userId as a fallback key.
  const rawRefreshToken = req.cookies.get("sevam_refresh")?.value;
  if (!rawRefreshToken) {
    return NextResponse.json(null, { status: 401 });
  }
  const refreshPayload = await verifyRefreshToken(rawRefreshToken);
  if (!refreshPayload) {
    return NextResponse.json(null, { status: 401 });
  }

  const rlKey = ip ?? `user:${refreshPayload.userId}`;
  const rl = await checkRateLimit(sessionRefreshLimiter, rlKey);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status:  429,
        headers: { "Retry-After": String(rl.retryAfter ?? 60) },
      }
    );
  }

  try {
    const { prisma } = await import("@/lib/db/prisma");
    // refreshPayload already verified above — use its userId directly
    const user = await prisma.user.findUnique({
      where:  { id: refreshPayload.userId },
      select: { id: true, phone: true, userType: true },
    });

    if (!user) {
      return NextResponse.json(null, { status: 404 });
    }

    const payload: SessionPayload = {
      userId:   user.id,
      phone:    user.phone,
      userType: user.userType as UserType,
    };

    const [accessToken, newRefresh] = await Promise.all([
      mintAccessToken(payload),
      mintRefreshToken({ userId: user.id }),
    ]);

    const res          = NextResponse.json(payload);
    const isProduction = process.env.NODE_ENV === "production";

    res.cookies.set("sevam_session", accessToken, {
      httpOnly: true,
      secure:   isProduction,
      sameSite: "lax",
      path:     "/",
      maxAge:   15 * 60,
    });

    res.cookies.set("sevam_refresh", newRefresh, {
      httpOnly: true,
      secure:   isProduction,
      sameSite: "lax",
      path:     "/",
      maxAge:   30 * 24 * 60 * 60, // 30 days — consistent with JWT TTL and login flow
    });

    return res;
  } catch (err) {
    // ── P0-B3: Auth failures are critical ────────────────────────────────
    captureCritical(err, { action: "session-refresh" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
