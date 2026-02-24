/**
 * SMS delivery via Twilio REST API.
 * No Twilio SDK needed — plain fetch keeps the bundle small.
 */

interface SmsResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";

/**
 * Send an SMS message via Twilio.
 * Returns `{ ok: true, sid }` on success or `{ ok: false, error }` on failure.
 * Never throws — callers must check `ok`.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    if (process.env.NODE_ENV !== "production") {
      // Do NOT log the phone number (PII) or body (contains OTP secret).
      console.info("[SMS DEV] Twilio not configured — SMS skipped.");
      return { ok: true, sid: "dev-sid" };
    }
    return { ok: false, error: "SMS provider not configured." };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const credentials = Buffer.from(
    `${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`
  ).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: TWILIO_PHONE_NUMBER, Body: body }),
      signal: AbortSignal.timeout(10_000), // 10 s hard timeout
    });

    // Safely parse the body — Twilio may return HTML on infrastructure errors
    const isJson = res.headers.get("content-type")?.includes("application/json");
    const json = isJson ? await res.json().catch(() => null) : null;
    const text = !isJson ? await res.text().catch(() => "") : null;

    if (!res.ok || !json?.sid) {
      return { ok: false, error: json?.message ?? text ?? `Twilio error ${res.status}` };
    }

    return { ok: true, sid: json.sid };
  } catch (err) {
    // Log only a safe reference, not the full error which may contain credentials.
    const message = err instanceof Error ? err.message : "Unknown SMS error";
    console.error("[SMS] Delivery failed (check Twilio config).");
    return { ok: false, error: message };
  }
}
