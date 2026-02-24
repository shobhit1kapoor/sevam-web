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
 * - P0-B3: Critical errors are captured by Sentry.
 */
export async function POST(req: NextRequest) {
  // ── P0-B1: Rate limit per IP ───────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = await checkRateLimit(sessionRefreshLimiter, ip);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter ?? 60) },
      }
    );
  }

  try {
    const refreshToken = req.cookies.get("sevam_refresh")?.value;
    if (!refreshToken) {
      return NextResponse.json(null, { status: 401 });
    }

    const refreshPayload = await verifyRefreshToken(refreshToken);
    if (!refreshPayload) {
      return NextResponse.json(null, { status: 401 });
    }

    const { prisma } = await import("@/lib/db/prisma");
    const user = await prisma.user.findUnique({
      where: { id: refreshPayload.userId },
      select: { id: true, phone: true, userType: true },
    });

    if (!user) {
      return NextResponse.json(null, { status: 404 });
    }

    const payload: SessionPayload = {
      userId: user.id,
      phone: user.phone,
      userType: user.userType as UserType,
    };

    const [accessToken, newRefresh] = await Promise.all([
      mintAccessToken(payload),
      mintRefreshToken({ userId: user.id }),
    ]);

    const res = NextResponse.json(payload);
    const isProduction = process.env.NODE_ENV === "production";

    res.cookies.set("sevam_session", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });

    res.cookies.set("sevam_refresh", newRefresh, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (err) {
    // ── P0-B3: Auth failures are critical ────────────────────────────────
    captureCritical(err, { action: "session-refresh" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
