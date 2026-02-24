"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log only the error name (safe) — not message or stack which may contain PII.
    // TODO: send to your telemetry/APM service.
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary]", error.name, info.componentStack?.split("\n")[1] ?? "");
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    const { children, fallback } = this.props;

    if (error) {
      if (fallback) return fallback(error, this.reset);

      return (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-4xl">😕</p>
          <h3 className="text-lg font-semibold text-foreground">Something went wrong</h3>
          <p className="text-sm text-muted max-w-xs">An unexpected error occurred. Please try again.</p>
          <Button size="sm" variant="outline" onClick={this.reset}>
            Retry
          </Button>
        </div>
      );
    }

    return children;
  }
}
