/**
 * Cookie name constants used by both middleware (Edge Runtime) and
 * server-side session helpers. Kept in a separate file so Edge-compatible
 * code does NOT accidentally pull in Prisma through lib/auth/session.ts.
 */
export const SESSION_COOKIE = "sevam_session";
export const REFRESH_COOKIE = "sevam_refresh";
