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
  /** Masked phone number for identification */
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
    if (ctx.userId) scope.setUser({ id: ctx.userId, username: ctx.phone });
    scope.setTag("action", ctx.action);
    if (ctx.jobId) scope.setTag("jobId", ctx.jobId);
    if (ctx.paymentId) scope.setTag("paymentId", ctx.paymentId);
    if (ctx.extra) scope.setExtras(ctx.extra);
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
    if (ctx.userId) scope.setUser({ id: ctx.userId, username: ctx.phone });
    scope.setTag("action", ctx.action);
    scope.setTag("critical", "true");
    if (ctx.jobId) scope.setTag("jobId", ctx.jobId);
    if (ctx.paymentId) scope.setTag("paymentId", ctx.paymentId);
    if (ctx.extra) scope.setExtras(ctx.extra);
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
