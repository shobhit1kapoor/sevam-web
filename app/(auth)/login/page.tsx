"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PhoneInput, isValidIndianMobile } from "@/components/forms/PhoneInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sendOtp } from "@/server/actions/auth/send-otp";
import { useAuthStore } from "@/lib/hooks/useAuthStore";

export default function LoginPage() {
  const router = useRouter();
  const { setPendingPhone, setError, error, clearError } = useAuthStore();

  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // A field-level error (format) separate from the server error
  const [fieldError, setFieldError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setFieldError(null);

    if (!isValidIndianMobile(phone)) {
      setFieldError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = `+91${phone}`;
      const result = await sendOtp(formattedPhone);

      if (!result.ok) {
        if (result.code === "RATE_LIMITED") {
          setError(result.error);
        } else {
          setFieldError(result.error);
        }
        return;
      }

      setPendingPhone(formattedPhone);
      router.push("/verify");
    } catch {
      setFieldError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2 text-center">
        {/* Brand mark */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[--color-primary-600]">
            <span className="text-xl font-black text-white tracking-tight">S</span>
          </div>
        </div>
        <CardTitle className="text-2xl">Welcome to Sevam</CardTitle>
        <CardDescription>
          Enter your mobile number to get started
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          <PhoneInput
            label="Mobile number"
            value={phone}
            onChange={(raw) => {
              setPhone(raw);
              setFieldError(null);
            }}
            error={fieldError ?? undefined}
            disabled={loading}
            autoFocus
          />

          {/* Rate-limit / server error banner */}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[--color-error]" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || phone.length < 10}
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Sending OTP…
              </span>
            ) : (
              "Send OTP"
            )}
          </Button>

          <p className="text-center text-xs text-[--color-muted-fg]">
            By continuing you agree to our{" "}
            <a href="/terms" className="underline hover:text-[--color-foreground]">
              Terms of Service
            </a>
            {" "}and{" "}
            <a href="/privacy" className="underline hover:text-[--color-foreground]">
              Privacy Policy
            </a>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
