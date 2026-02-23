import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Show character counter when provided a positive number */
  maxChars?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, maxChars, id, value, onChange, defaultValue, ...props }, ref) => {
    const reactId = React.useId();
    // Always include reactId suffix when deriving from label to prevent duplicate IDs
    // when multiple textareas share the same label text.
    const textareaId = id ?? (label ? `${label.toLowerCase().replace(/\s+/g, "-")}-${reactId}` : reactId);

    // Support uncontrolled mode for char counter.
    // Initialize from defaultValue so the counter is correct from the first render.
    const [internalValue, setInternalValue] = React.useState(() => String(defaultValue ?? ""));
    const isControlled = value !== undefined;
    const charCount = isControlled
      ? (typeof value === "string" ? value.length : 0)
      : internalValue.length;
    const overLimit = maxChars ? charCount > maxChars : false;

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      if (!isControlled) setInternalValue(e.target.value);
      onChange?.(e);
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          value={isControlled ? value : internalValue}
          onChange={handleChange}
          aria-invalid={Boolean(error || overLimit)}
          aria-describedby={
            error ? `${textareaId}-error` :
            overLimit ? `${textareaId}-counter` : undefined
          }
          className={cn(
            "w-full rounded-xl border border-border bg-input",
            "px-4 py-3 text-sm text-foreground placeholder:text-muted",
            "resize-y min-h-[100px]",
            "transition-colors duration-150",
            "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            (error || overLimit) && "border-error focus:border-error focus:ring-error/20",
            className
          )}
          {...props}
        />

        <div className="flex items-center justify-between">
          {error ? (
            <p id={`${textareaId}-error`} className="text-xs text-error" role="alert">
              {error}
            </p>
          ) : (
            <span />
          )}

          {maxChars && (
            <span
              id={`${textareaId}-counter`}
              className={cn(
                "text-xs tabular-nums",
                overLimit ? "text-error" : "text-muted"
              )}
            >
              {charCount}/{maxChars}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
