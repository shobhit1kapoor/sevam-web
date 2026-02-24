// ─── Auth Types ───────────────────────────────────────────────────────────────

export type UserType = "CUSTOMER" | "WORKER" | "ADMIN";

export interface SessionPayload {
  userId: string;
  phone: string;
  userType: UserType;
  /** Issued-at timestamp (seconds) */
  iat?: number;
  /** Expiry timestamp (seconds) */
  exp?: number;
}

// ─── Server Action Result Types ───────────────────────────────────────────────

export type ActionResult<T = undefined> =
  T extends undefined
    ? { ok: true } | { ok: false; error: string; code?: ActionErrorCode }
    : { ok: true; data: T } | { ok: false; error: string; code?: ActionErrorCode };

export type ActionErrorCode =
  | "INVALID_PHONE"
  | "RATE_LIMITED"
  | "SMS_FAILED"
  | "OTP_NOT_FOUND"
  | "OTP_EXPIRED"
  | "OTP_LOCKED"
  | "OTP_INVALID"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "SERVER_ERROR";

// ─── OTP ──────────────────────────────────────────────────────────────────────

export interface OtpRecord {
  id: string;
  phone: string;
  hashedOtp: string;
  expiresAt: Date;
  attempts: number;
  sendCount: number;
  windowStart: Date;
}
