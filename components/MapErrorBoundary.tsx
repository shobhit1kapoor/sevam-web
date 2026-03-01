"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Specialised error boundary for map components (JobMap / TrackingMap).
 *
 * Map failures are non-critical — the user should still be able to use the
 * rest of the page. This boundary renders a lightweight fallback instead of
 * crashing the whole layout.
 */
export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-xl bg-muted/30 border border-border p-8 text-center"
          style={{ minHeight: 200 }}
        >
          <p className="text-2xl" aria-hidden="true">🗺️</p>
          <p className="text-sm font-medium text-foreground">Map unavailable</p>
          <p className="text-xs text-muted max-w-xs">
            Could not load the map. Check your connection or try again.
          </p>
          <Button size="sm" variant="outline" onClick={this.reset}>
            Retry map
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
