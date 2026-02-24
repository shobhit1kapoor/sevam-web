import { NextRequest, NextResponse } from "next/server";
import { mintAccessToken, mintRefreshToken, verifyRefreshToken } from "@/lib/auth/session";
import type { SessionPayload, UserType } from "@/types/auth";

/**
 * POST /api/auth/session-refresh
 *
 * Called internally by the middleware (edge) to refresh a session.
 * Accepts { userId } in the request body (already verified by middleware).
 * Uses the Node.js runtime so Prisma is available.
 */
export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get("sevam_refresh")?.value;
    if (!refreshToken) {
      return NextResponse.json(null, { status: 401 });
    }

    const refreshPayload = await verifyRefreshToken(refreshToken);
    if (!refreshPayload) {
      return NextResponse.json(null, { status: 401 });
    }

    // Dynamically import Prisma so this route stays Node-only
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
      maxAge: 30 * 24 * 60 * 60,
    });

    return res;
  } catch (err) {
    console.error("[session-refresh] Error:", err);
    return NextResponse.json(null, { status: 500 });
  }
}
