"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Only send the stable digest to internal telemetry — never the full error
    // object which may contain PII or internal implementation details.
    if (process.env.NODE_ENV !== "production") {
      // In dev it is useful to see the error name (not message) for quick triage.
      console.error("[GlobalError]", error.name, error.digest ?? "");
    }
    // TODO: send error.digest to your telemetry/APM service here.
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <div>
        <p className="text-5xl mb-2">⚠️</p>
        <h2 className="text-2xl font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-2 text-muted text-sm">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted font-mono">Reference: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Go Home
        </Button>
      </div>
    </main>
  );
}
