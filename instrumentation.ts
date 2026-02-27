/**
 * Next.js Instrumentation hook.
 * This file is automatically loaded by Next.js 15+ before the app starts.
 * It initialises Sentry for both Node.js and Edge runtimes.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture all unhandled request errors (Next.js 15+ feature)
export const onRequestError: Instrumentation.onRequestError =
  Sentry.captureRequestError;
