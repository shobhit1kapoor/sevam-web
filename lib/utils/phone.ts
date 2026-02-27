/**
 * Phone number utilities for Sevam.
 * Canonical format: +91XXXXXXXXXX (Indian mobile numbers).
 *
 * Accepted input formats:
 *   +91-XXXXX-XXXXX   (dashes / spaces OK)
 *   +91XXXXXXXXXX
 *   91XXXXXXXXXX      (country code without +)
 *   0XXXXXXXXXX       (domestic 0-prefix)
 *   XXXXXXXXXX        (bare 10-digit)
 *
 * WhatsApp numbers use the same +91 format; no special handling is needed.
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
 * Normalise a phone number — strips whitespace/dashes/parens, ensures +91 prefix.
 *
 * @throws {Error} if the result is not a valid Indian mobile number.
 */
export function normalisePhone(raw: string): string {
  // Strip whitespace, dashes, dots, parens
  let phone = raw.trim().replace(/[\s\-.()\u200B]/g, "");

  // Remove any non-digit characters except a leading +
  // e.g. "+91 98765 43210" → "+919876543210"
  phone = phone.replace(/(?!^\+)\D/g, "");

  // 91XXXXXXXXXX → +91XXXXXXXXXX (no leading +)
  if (/^91[6-9]\d{9}$/.test(phone)) {
    phone = `+${phone}`;
  }

  // Bare 10-digit: XXXXXXXXXX
  if (/^[6-9]\d{9}$/.test(phone)) {
    phone = `+91${phone}`;
  }

  // 0-prefixed domestic: 0XXXXXXXXXX
  if (/^0[6-9]\d{9}$/.test(phone)) {
    phone = `+91${phone.slice(1)}`;
  }

  if (!isValidPhone(phone)) {
    throw new Error(`Invalid phone number: "${raw}"`);
  }

  return phone;
}

/**
 * Attempt to normalise a phone number; return null on failure instead of throwing.
 * Useful in validation pipelines where a nullable result is cleaner.
 */
export function tryNormalisePhone(raw: string): string | null {
  try {
    return normalisePhone(raw);
  } catch {
    return null;
  }
}

/**
 * Given an array of raw phone strings, return a deduplicated array of canonical
 * +91XXXXXXXXXX strings. Invalid entries are silently skipped.
 *
 * Useful for deduplicating FCM token lookups and bulk SMS lists.
 */
export function deduplicatePhones(raws: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of raws) {
    const canonical = tryNormalisePhone(raw);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}

/**
 * Mask a phone number for display/logging: +91XXXXXX4321 → +91XXXXXX4321 → "+91 XXXXX X4321".
 * Returns the last 4 digits with the rest masked.
 */
export function maskPhone(phone: string): string {
  const canonical = tryNormalisePhone(phone);
  if (!canonical) return "[REDACTED]";
  // canonical is always +91 + 10 digits = 13 chars
  const last4 = canonical.slice(-4);
  return `+91 XXXXXX${last4}`;
}
