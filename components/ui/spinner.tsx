import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZE_CLASSES = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
} as const;

export function Spinner({ size = "md", className, label = "Loading…" }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn("inline-block", className)}>
      <span
        className={cn(
          "block rounded-full border-primary/20 border-t-primary animate-spin",
          SIZE_CLASSES[size]
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Full-screen loading overlay */
export function PageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
