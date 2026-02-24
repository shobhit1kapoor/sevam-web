/**
 * Firebase Cloud Messaging — HTTP v1 API helper.
 * Uses service-account access token via Google OAuth2. No firebase-admin SDK needed.
 */

interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

const FCM_PROJECT_ID = process.env.FCM_PROJECT_ID ?? "";
const FCM_SERVICE_ACCOUNT_JSON = process.env.FCM_SERVICE_ACCOUNT_JSON ?? "";

/**
 * Get a short-lived OAuth2 access token using the service account.
 * Caches the token in-memory (valid for 1 hour); prevents duplicate refreshes.
 */
// In-memory cache
let _cachedToken: string | null = null;
let _tokenExpiry = 0;
let _tokenPromise: Promise<string> | null = null;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 2-min safety margin)
  if (_cachedToken && Date.now() < _tokenExpiry - 120_000) {
    return _cachedToken;
  }
  // De-duplicate concurrent refresh requests
  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = (async () => {
    if (!FCM_SERVICE_ACCOUNT_JSON) {
      throw new Error("Missing env: FCM_SERVICE_ACCOUNT_JSON");
    }

    let sa: { client_email: string; private_key: string };
    try {
      sa = JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as { client_email: string; private_key: string };
    } catch (err) {
      throw new Error(`Failed to parse FCM_SERVICE_ACCOUNT_JSON: ${err instanceof Error ? err.message : err}`);
    }

    // Build a signed JWT for the Google OAuth2 token endpoint
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;

    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
      })
    ).toString("base64url");

    const { createSign } = await import("crypto");
    const sign = createSign("RSA-SHA256");
    sign.update(`${header}.${payload}`);
    const sig = sign.sign(sa.private_key, "base64url");
    const jwt = `${header}.${payload}.${sig}`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => "");
      throw new Error(`Google OAuth2 token request failed: HTTP ${tokenRes.status} — ${errBody}`);
    }

    const tokenJson = await tokenRes.json() as { access_token: string; expires_in?: number };
    _cachedToken = tokenJson.access_token;
    _tokenExpiry = Date.now() + (tokenJson.expires_in ?? 3600) * 1000;
    return _cachedToken;
  })().finally(() => { _tokenPromise = null; });

  return _tokenPromise;
}

/**
 * Send a push notification to a single FCM device token.
 * Fails silently (logs) so notification failures never break core flows.
 */
export async function sendPushNotification(
  fcmToken: string,
  { title, body, data }: FcmPayload
): Promise<void> {
  if (!FCM_PROJECT_ID || !FCM_SERVICE_ACCOUNT_JSON) {
    if (process.env.NODE_ENV !== "production") {
      // Do NOT log FCM tokens (device identifiers / PII) or notification body.
      console.info("[FCM DEV] FCM not configured — push notification skipped.");
    }
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: { title, body },
          data: data ?? {},
          android: { priority: "high" },
          apns: { payload: { aps: { sound: "default" } } },
        },
      }),
    });

    if (!res.ok) {
      // Log only the HTTP status — not the full error body which may contain token data.
      console.error(`[FCM] Send failed: HTTP ${res.status}`);
    }
  } catch {
    console.error("[FCM] Unexpected error sending push notification.");
  }
}

/**
 * Send the same notification to multiple tokens (fan-out).
 * Ignores individual failures.
 */
export async function sendPushToMany(
  fcmTokens: string[],
  payload: FcmPayload
): Promise<void> {
  await Promise.allSettled(
    fcmTokens.map((token) => sendPushNotification(token, payload))
  );
}
