"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { OtpInput } from "@/components/forms/OtpInput";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { verifyOtp } from "@/server/actions/auth/verify-otp";
import { sendOtp } from "@/server/actions/auth/send-otp";
import { useAuthStore } from "@/lib/hooks/useAuthStore";
import type { UserType } from "@/types/auth";

const RESEND_COOLDOWN = 30; // seconds

/** Mask a +91XXXXXXXXXX phone as "+91 XXXXX 12345" */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return phone;
  const last10 = digits.slice(-10);
  return `+91 XXXXX ${last10.slice(5)}`;
}

/** Where to send each user type after login */
const HOME_FOR: Record<UserType, string> = {
  CUSTOMER: "/jobs",
  WORKER: "/dashboard",
  ADMIN: "/analytics",
};

export default function VerifyPage() {
  const router = useRouter();
  const { pendingPhone, setUser, setError, error, clearError } = useAuthStore();

  const [otp, setOtp] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [otpError, setOtpError] = React.useState<string | null>(null);

  // Resend cooldown
  const [countdown, setCountdown] = React.useState(RESEND_COOLDOWN);
  const [resendLoading, setResendLoading] = React.useState(false);

  // Redirect to login if there's no pending phone
  React.useEffect(() => {
    if (!pendingPhone) {
      router.replace("/login");
    }
  }, [pendingPhone, router]);

  // Countdown tick
  React.useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  // Auto-submit when 6 digits are filled
  async function handleOtpComplete(completed: string) {
    setOtp(completed);
    await submitOtp(completed);
  }

  async function submitOtp(value: string = otp) {
    if (!pendingPhone || value.length !== 6) return;
    if (loading) return;
    clearError();
    setOtpError(null);
    setHasError(false);
    setLoading(true);

    try {
      const result = await verifyOtp(pendingPhone, value);

      if (!result.ok) {
        setHasError(true);
        setOtp(""); // clear boxes so user can retype
        if (result.code === "OTP_LOCKED" || result.code === "OTP_EXPIRED") {
          setError(result.error);
        } else {
          setOtpError(result.error);
        }
        return;
      }

      if (result.data) {
        setUser(result.data);
        router.push(HOME_FOR[result.data.userType]);
      }
    } catch {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingPhone || countdown > 0 || resendLoading) return;
    setResendLoading(true);
    clearError();
    setOtpError(null);

    try {
      const result = await sendOtp(pendingPhone);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOtp("");
      setHasError(false);
      setCountdown(RESEND_COOLDOWN);
    } finally {
      setResendLoading(false);
    }
  }

  if (!pendingPhone) return null; // will redirect

  return (
    <Card className="shadow-lg">
      <CardHeader className="pb-2 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[--color-primary-600]">
            <span className="text-xl font-black text-white tracking-tight">S</span>
          </div>
        </div>
        <CardTitle className="text-2xl">Verify your number</CardTitle>
        <CardDescription>
          Enter the 6-digit OTP sent to{" "}
          <span className="font-medium text-[--color-foreground]">
            {maskPhone(pendingPhone)}
          </span>
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="flex flex-col items-center gap-6">
          {/* OTP boxes */}
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={handleOtpComplete}
            hasError={hasError}
            disabled={loading}
          />

          {/* Field-level OTP error */}
          {otpError && (
            <p className="text-sm text-[--color-error]" role="alert">
              {otpError}
            </p>
          )}

          {/* Locked / expired / server error banner */}
          {error && (
            <div className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm text-[--color-error]" role="alert">
              <p>{error}</p>
              {(error.includes("expired") || error.includes("attempts")) && (
                <button
                  type="button"
                  onClick={() => {
                    clearError();
                    router.replace("/login");
                  }}
                  className="mt-1 font-medium underline"
                >
                  Go back to login
                </button>
              )}
            </div>
          )}

          {/* Verify button (manual submit) */}
          <Button
            className="w-full"
            size="lg"
            onClick={() => submitOtp()}
            disabled={loading || otp.length !== 6}
            aria-busy={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Spinner />
                Verifying…
              </span>
            ) : (
              "Verify OTP"
            )}
          </Button>

          {/* Resend / countdown */}
          <div className="text-sm text-[--color-muted-fg]">
            {countdown > 0 ? (
              <span>
                Resend OTP in{" "}
                <span className="tabular-nums font-medium text-[--color-foreground]">
                  {countdown}s
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="font-medium text-[--color-primary-600] hover:underline disabled:opacity-50"
              >
                {resendLoading ? "Sending…" : "Resend OTP"}
              </button>
            )}
          </div>

          {/* Change number link */}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-xs text-[--color-muted-fg] hover:text-[--color-foreground] hover:underline"
          >
            Change mobile number
          </button>
        </div>
      </CardContent>
    </Card>
  );
}


