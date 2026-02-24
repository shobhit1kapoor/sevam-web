import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
    const reactId = React.useId();
    // Always include reactId suffix when deriving from label to prevent duplicate IDs
    // when multiple inputs share the same label text.
    const inputId = id ?? (label ? `${label.toLowerCase().replace(/\s+/g, "-")}-${reactId}` : reactId);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[--color-foreground]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border border-[--color-border] bg-[--color-background] px-3 py-2 text-sm text-[--color-foreground] placeholder:text-[--color-muted-fg] transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[--color-ring] focus-visible:border-[--color-primary-600]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[--color-error] focus-visible:ring-[--color-error]",
            className
          )}
          ref={ref}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          aria-invalid={!!error}
          {...props}
        />
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[--color-muted-fg]">
            {hint}
          </p>
        )}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-[--color-error]"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
