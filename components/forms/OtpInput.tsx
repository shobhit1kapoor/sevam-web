"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OtpInputProps {
  /** Controlled 6-char OTP string. */
  value?: string;
  /** Fires with the current 6-char string on every change. */
  onChange?: (otp: string) => void;
  /** Fires when all 6 digits have been filled. */
  onComplete?: (otp: string) => void;
  length?: number;
  disabled?: boolean;
  /** When true, applies a CSS shake animation for one render cycle. */
  hasError?: boolean;
  /**
   * Increment this number to re-trigger the shake animation even when
   * `hasError` remains true (e.g., multiple wrong attempts in a row).
   */
  shakeTrigger?: number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OtpInput({
  value = "",
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  hasError = false,
  shakeTrigger,
  className,
}: OtpInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  const [shaking, setShaking] = React.useState(false);

  // Trigger shake when hasError flips to true OR shakeTrigger changes
  React.useEffect(() => {
    if (hasError) {
      setShaking(true);
      const id = setTimeout(() => setShaking(false), 600);
      return () => clearTimeout(id);
    }
  }, [hasError, shakeTrigger]);

  // Split controlled value into array of single chars
  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  function focusAt(index: number) {
    const el = inputRefs.current[Math.max(0, Math.min(length - 1, index))];
    el?.focus();
  }

  function updateValue(nextChars: string[]) {
    const otp = nextChars.join("").slice(0, length);
    onChange?.(otp);
    if (otp.length === length) onComplete?.(otp);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>, index: number) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const next = [...chars];
    next[index] = raw[raw.length - 1]; // take last digit typed
    updateValue(next);
    if (index < length - 1) focusAt(index + 1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...chars];
      if (next[index]) {
        next[index] = "";
        updateValue(next);
      } else if (index > 0) {
        next[index - 1] = "";
        updateValue(next);
        focusAt(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    const next = Array.from({ length }, (_, i) => pasted[i] ?? "");
    updateValue(next);
    // focus the last filled box (or last box)
    focusAt(Math.min(pasted.length, length - 1));
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  return (
    <div
      role="group"
      aria-label="One-time password input"
      className={cn(
        "flex items-center gap-2 sm:gap-3",
        shaking && "animate-shake",
        className
      )}
    >
      {chars.map((char, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={char}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1}`}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          onFocus={handleFocus}
          className={cn(
            // Box styling
            "h-12 w-10 sm:w-12 rounded-lg border text-center text-lg font-semibold",
            "bg-[--color-background] text-[--color-foreground]",
            "transition-all duration-150",
            // Default border
            "border-[--color-border]",
            // Focus ring
            "focus:outline-none focus:border-[--color-primary-600] focus:ring-2 focus:ring-[--color-ring]/20",
            // Error state
            hasError
              ? "border-[--color-error] bg-red-50 text-[--color-error] focus:border-[--color-error] focus:ring-[--color-error]/20"
              : char && "border-[--color-primary-400] bg-[--color-primary-50]",
            // Disabled
            "disabled:cursor-not-allowed disabled:opacity-40"
          )}
        />
      ))}
    </div>
  );
}
