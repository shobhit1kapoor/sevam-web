import crypto from "crypto";
import Razorpay from "razorpay";

const keyId     = process.env.RAZORPAY_KEY_ID     ?? "";
const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";

/** Lazily-initialised Razorpay client (server-only). */
let _razorpay: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
  }
  if (!_razorpay) {
    _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _razorpay;
}

/**
 * Verify the HMAC-SHA256 signature returned by Razorpay after payment.
 * See: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/build-integration/#verify-payment-signature
 *
 * Overload 1: payment callback  — verifyRazorpaySignature(orderId, paymentId, signature)
 * Overload 2: webhook body      — verifyRazorpaySignature(rawBody, "", webhookSignature, webhookSecret)
 */
export function verifyRazorpaySignature(
  first: string,
  second: string,
  signature: string,
  overrideSecret?: string
): boolean {
  const secret = overrideSecret ?? keySecret;
  const body = overrideSecret
    ? first                          // webhook: first arg is raw body
    : `${first}|${second}`;          // payment: orderId|paymentId
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  // Timing-safe compare: avoids early-exit leaking the expected length
  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}
