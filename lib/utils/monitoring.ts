/**
 * Sentry error monitoring helpers.
 *
 * Use captureError() in every server action catch block.
 * Use captureCritical() for payment and auth failures.
 *
 * Required env var:
 *   NEXT_PUBLIC_SENTRY_DSN  (or SENTRY_DSN for server-only)
 */

import * as Sentry from "@sentry/nextjs";

export interface ErrorContext {
  /** Authenticated user id, if known */
  userId?: string;
  /**
   * Phone number — will be masked (e.g. +91XXXXXX23) before being sent to
   * Sentry to comply with data-minimisation requirements.
   */
  phone?: string;
  /** Name of the server action or API route */
  action: string;
  /** Related job id, if applicable */
  jobId?: string;
  /** Related payment id, if applicable */
  paymentId?: string;
  /** Any extra structured context */
  extra?: Record<string, unknown>;
}

/**
 * Mask a phone number for Sentry — keeps country code prefix and last 2 digits.
 * e.g. +919876543210 → +91XXXXXX10
 */
function maskPhone(phone: string): string {
  // Handles variable-length national numbers (e.g. +91 + 10 digits):
  // capture country code, optional 0-2 leading national digits, 6 middle digits
  // (to be masked), and the last 2 digits.
  // +919876543210 → +9198XXXXXX10  |  +9112345678 → +91XXXXXX78
  const masked = phone.replace(/(\+\d{2})(\d{0,2})\d{6}(\d{2})$/, "$1$2XXXXXX$3");
  // If the regex didn't match (unexpected format), return a safe fallback
  // rather than leaking the raw phone number to Sentry.
  return masked !== phone ? masked : "[REDACTED]";
}

/** Apply common scope tags/user from ErrorContext. */
function applyScope(scope: Sentry.Scope, ctx: ErrorContext): void {
  if (ctx.userId) {
    scope.setUser({
      id: ctx.userId,
      // Masked so Sentry never stores raw PII
      username: ctx.phone ? maskPhone(ctx.phone) : undefined,
    });
  }
  scope.setTag("action", ctx.action);
  if (ctx.jobId)     scope.setTag("jobId",     ctx.jobId);
  if (ctx.paymentId) scope.setTag("paymentId", ctx.paymentId);
  if (ctx.extra)     scope.setExtras(ctx.extra);
}

/**
 * Capture a server action or API error with structured context.
 *
 * @example
 * catch (err) {
 *   captureError(err, { action: "createJob", userId: session.userId });
 *   return { ok: false, error: "Something went wrong.", code: "SERVER_ERROR" };
 * }
 */
export function captureError(error: unknown, ctx: ErrorContext): void {
  Sentry.withScope((scope) => {
    applyScope(scope, ctx);
    Sentry.captureException(error);
  });
}

/**
 * Capture a CRITICAL failure (payment processing, auth, session).
 * Sets Sentry severity to "fatal" which triggers high-priority alerts.
 *
 * @example
 * catch (err) {
 *   captureCritical(err, { action: "razorpay-webhook", paymentId: orderId });
 *   return NextResponse.json({ error: "webhook failed" }, { status: 500 });
 * }
 */
export function captureCritical(error: unknown, ctx: ErrorContext): void {
  Sentry.withScope((scope) => {
    scope.setLevel("fatal");
    scope.setTag("critical", "true");
    applyScope(scope, ctx);
    Sentry.captureException(error);
  });
}

/**
 * Log a breadcrumb for non-error events (useful for tracing payment flows).
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({ message, data, level: "info" });
}
