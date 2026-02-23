import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
// Import ONLY the cookie name constants — this file must stay Edge-Runtime safe.
// Do NOT import from lib/auth/session here as it chains to Prisma.
import { SESSION_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import type { SessionPayload, UserType } from "@/types/auth";

// ─── Route → required user type map ──────────────────────────────────────────

const PROTECTED_ROUTES: { pattern: RegExp; requiredType: UserType }[] = [
  { pattern: /^\/(jobs|track|payment)(\/|$)/, requiredType: "CUSTOMER" },
  { pattern: /^\/(dashboard|earnings|profile)(\/|$)/, requiredType: "WORKER" },
  { pattern: /^\/(analytics|users|settings)(\/|$)/, requiredType: "ADMIN" },
];

const AUTH_ROUTES = ["/login", "/verify"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSecret(envVar: string, fallback: string): Uint8Array {
  const val = process.env[envVar];
  if (!val) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
    return new TextEncoder().encode(fallback);
  }
  return new TextEncoder().encode(val);
}

const ACCESS_SECRET = () =>
  getSecret("JWT_ACCESS_SECRET", "dev-access-secret-change-me");
const REFRESH_SECRET = () =>
  getSecret("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me");

async function parseAccessToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET());
    if (
      typeof payload.userId !== "string" || !payload.userId ||
      typeof payload.phone  !== "string" || !payload.phone  ||
      !["CUSTOMER", "WORKER", "ADMIN"].includes(payload.userType as string)
    ) {
      return null;
    }
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

async function parseRefreshToken(
  token: string
): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET());
    if (typeof payload.userId !== "string" || !payload.userId) {
      return null;
    }
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Determine if this is a protected route & what type is required ──
  const match = PROTECTED_ROUTES.find((r) => r.pattern.test(pathname));

  // Public routes — pass through
  if (!match) return NextResponse.next();

  const accessToken = req.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;

  let session: SessionPayload | null = null;
  let refreshedSetCookies: string[] = [];

  // ── 1. Try access token ─────────────────────────────────────────────
  if (accessToken) {
    session = await parseAccessToken(accessToken);
  }

  // ── 2. Token refresh — access expired but refresh is valid ──────────
  if (!session && refreshToken) {
    const refreshPayload = await parseRefreshToken(refreshToken);

    if (refreshPayload) {
      // Re-fetch user info via a lightweight internal API call so we keep
      // the edge runtime compatible (no Prisma in edge middleware).
      const userRes = await fetch(
        new URL(`/api/auth/session-refresh`, req.url),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: req.headers.get("cookie") ?? "",
          },
          body: JSON.stringify({ userId: refreshPayload.userId }),
        }
      );

      if (userRes.ok) {
        const newSession = (await userRes.json()) as SessionPayload | null;
        if (newSession) {
          session = newSession;
          // Preserve the new cookies so we can carry them on the final response.
          refreshedSetCookies = userRes.headers.getSetCookie();
        }
      }
    }
  }

  // ── 3. No valid session → redirect to login ─────────────────────────
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Check user type authorisation ────────────────────────────────
  if (session.userType !== match.requiredType) {
    // Redirect to correct home for the authenticated user's type
    const homeMap: Record<UserType, string> = {
      CUSTOMER: "/jobs",
      WORKER: "/dashboard",
      ADMIN: "/analytics",
    };
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = homeMap[session.userType];
    return NextResponse.redirect(homeUrl);
  }

  // ── 5. Build final response ───────────────────────────────────────
  // Set identity headers on the INNER REQUEST so Server Components can read
  // them via headers().get(). Do NOT set them on the outer response — that
  // would expose user identifiers to the browser.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-user-id");    // strip any client-supplied forgery
  requestHeaders.delete("x-user-type");
  requestHeaders.set("x-user-id",   session.userId);
  requestHeaders.set("x-user-type", session.userType);

  const finalResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // Carry over refreshed session cookies so the browser receives them.
  for (const cookie of refreshedSetCookies) {
    finalResponse.headers.append("set-cookie", cookie);
  }

  return finalResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - /api/auth/* (auth endpoints must stay public)
     * - /login, /verify (auth pages)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|login|verify).*)",
  ],
};
