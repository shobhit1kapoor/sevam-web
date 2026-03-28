import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry CLI output during builds
  silent: !process.env.CI,

  // Upload source maps and associate them with the release
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Hides source maps from the client bundle
  hideSourceMaps: true,

  // Disable tree-shaking of Sentry logger statements in production
  disableLogger: true,

  // Upload larger set of files so stack traces resolve correctly
  widenClientFileUpload: true,
});
