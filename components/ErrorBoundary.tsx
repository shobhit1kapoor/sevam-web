"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui";

interface Props {
  children: ReactNode;
  /** Custom fallback renderer. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Optional label attached to Sentry reports for context. */
  boundaryName?: string;
}

interface State {
  error: Error | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      extra: {
        componentStack: info.componentStack,
        boundary:       this.props.boundaryName ?? "unknown",
      },
    });
    this.setState({ eventId: eventId ?? null });

    if (process.env.NODE_ENV !== "production") {
      // Only log the error name — not message/stack which may contain PII.
      console.error(
        "[ErrorBoundary]",
        this.props.boundaryName ?? "",
        error.name,
        info.componentStack?.split("\n")[1] ?? "",
      );
    }
  }

  reset = () => this.setState({ error: null, eventId: null });

  render() {
    const { error, eventId } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) return fallback(error, this.reset);

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center gap-4 py-16 text-center"
        >
          <p className="text-4xl" aria-hidden="true">😕</p>
          <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
          <p className="text-sm text-muted max-w-xs">
            An unexpected error occurred. Please try again.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={this.reset}>
              Retry
            </Button>
            {eventId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  Sentry.showReportDialog({ eventId })
                }
              >
                Report issue
              </Button>
            )}
          </div>
        </div>
      );
    }

    return children;
  }
}
