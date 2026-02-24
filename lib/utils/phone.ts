/**
 * Phone number utilities for Sevam.
 * Accepted format: +91XXXXXXXXXX (Indian mobile numbers)
 */

const INDIA_PHONE_REGEX = /^\+91[6-9]\d{9}$/;

/**
 * Returns true if the phone string matches +91XXXXXXXXXX.
 * The leading digit of the 10-digit number must be 6–9 (valid Indian mobile).
 */
export function isValidPhone(phone: string): boolean {
  return INDIA_PHONE_REGEX.test(phone.trim());
}

/**
 * Normalise a phone number — strips spaces/dashes, ensures +91 prefix.
 * Throws if the result is still invalid.
 */
export function normalisePhone(raw: string): string {
  let phone = raw.trim().replace(/[\s\-()]/g, "");

  // Accept bare 10-digit numbers
  if (/^[6-9]\d{9}$/.test(phone)) {
    phone = `+91${phone}`;
  }

  // Accept 0-prefixed domestic format
  if (/^0[6-9]\d{9}$/.test(phone)) {
    phone = `+91${phone.slice(1)}`;
  }

  if (!isValidPhone(phone)) {
    throw new Error("Invalid phone number");
  }

  return phone;
}
