"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip all non-digits from a string. */
function digits(v: string) {
  return v.replace(/\D/g, "");
}

/**
 * Format a raw 10-digit number as "XXXXX XXXXX".
 * Handles partial input gracefully.
 */
function formatPhone(raw: string): string {
  const d = digits(raw).slice(0, 10);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

function isValidIndianMobile(raw: string): boolean {
  const d = digits(raw);
  return d.length === 10 && /^[6-9]/.test(d);
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  /** Controlled raw value (digits only, no country code). */
  value?: string;
  /** Fires with raw 10-digit string (no formatting, no +91). */
  onChange?: (raw: string) => void;
  label?: string;
  error?: string;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = "", onChange, label, error, className, onBlur, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const [touched, setTouched] = React.useState(false);

    // Derive displayed value from the controlled raw value
    const displayed = formatPhone(value);

    const internalError =
      touched && !error && value.length > 0 && !isValidIndianMobile(value)
        ? "Enter a valid 10-digit mobile number"
        : error;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const raw = digits(e.target.value).slice(0, 10);
      onChange?.(raw);
    }

    function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
      setTouched(true);
      onBlur?.(e);
    }

    // Keep caret at end when value changes
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      const input = e.currentTarget;
      // Allow: Ctrl/Cmd shortcuts (copy, paste, select all, etc.)
      if (e.ctrlKey || e.metaKey) return;
      // Allow: Shift+Insert paste
      if (e.shiftKey && e.key === "Insert") return;
      // Allow: backspace, delete, tab, escape, enter, arrows
      const allowed = [
        "Backspace", "Delete", "Tab", "Escape", "Enter",
        "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
      ];
      if (allowed.includes(e.key)) return;
      // Block non-numeric
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
      }
      // Enforce max 10 digits
      if (digits(input.value).length >= 10) {
        e.preventDefault();
      }
    }

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

        <div
          className={cn(
            "flex h-12 w-full items-center rounded-lg border border-[--color-border] bg-[--color-background] text-sm transition-colors",
            "focus-within:border-[--color-primary-600] focus-within:ring-2 focus-within:ring-[--color-ring]/20",
            internalError && "border-[--color-error] focus-within:ring-[--color-error]/20"
          )}
        >
          {/* +91 prefix badge */}
          <span className="flex h-full select-none items-center border-r border-[--color-border] bg-[--color-muted] px-3 text-sm font-medium text-[--color-muted-fg] rounded-l-lg">
            +91
          </span>

          <input
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="99999 99999"
            value={displayed}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            maxLength={11} /* 10 digits + 1 space */
            aria-label={label ?? "Mobile number"}
            aria-describedby={internalError ? `${inputId}-error` : undefined}
            aria-invalid={!!internalError}
            className={cn(
              "h-full flex-1 bg-transparent px-3 text-[--color-foreground] placeholder:text-[--color-muted-fg]",
              "focus:outline-none",
              className
            )}
            {...props}
          />
        </div>

        {internalError && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-[--color-error]"
            role="alert"
          >
            {internalError}
          </p>
        )}
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput, isValidIndianMobile, formatPhone };
