import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 20% of transactions in production, 100% in dev/staging
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session Replay: capture all replays where an error occurred
  replaysOnErrorSampleRate: 1.0,
  // Session Replay: capture 10% of all sessions
  replaysSessionSampleRate: 0.1,

  integrations: [Sentry.replayIntegration()],

  debug: false,
});
