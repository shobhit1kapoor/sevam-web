/**
 * Input sanitization utilities.
 *
 * All user-supplied text must pass through one of these functions before being
 * stored in the database or rendered. This prevents:
 *   - XSS: HTML/JS tags stripped from all text fields.
 *   - SQL injection: Prisma uses parameterized queries exclusively (see note).
 *
 * ─── SQL Injection Audit ─────────────────────────────────────────────────────
 * This project uses Prisma ORM. Prisma uses parameterized queries for all
 * auto-generated model operations (create, update, findMany, etc.).
 *
 * For raw queries, ONLY the safe tagged-template form is permitted:
 *   ✓  prisma.$queryRaw`SELECT … WHERE id = ${id}`
 *   ✗  prisma.$queryRawUnsafe(`SELECT … WHERE id = '${id}'`)  — NEVER use this
 *
 * No raw queries using string interpolation are present in this codebase.
 * All dynamic values flow through Prisma's parameterized API.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import xss from "xss";

/** Options that strip ALL HTML — only plain text allowed. */
const PLAIN_TEXT_OPTIONS = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed"],
} as const;

/**
 * Sanitize any plain-text field (names, addresses, bio, etc.).
 * Strips all HTML tags and trims whitespace.
 */
export function sanitizeText(raw: string): string {
  return xss(raw.trim(), PLAIN_TEXT_OPTIONS);
}

/**
 * Sanitize a job description.
 * Strips all HTML/JS — we store and display plain text only.
 */
export function sanitizeDescription(raw: string): string {
  return sanitizeText(raw);
}

/**
 * Sanitize a street/location address.
 */
export function sanitizeAddress(raw: string): string {
  return sanitizeText(raw);
}

/**
 * Sanitize a user display name.
 */
export function sanitizeName(raw: string): string {
  return sanitizeText(raw);
}

/**
 * Sanitize a worker bio.
 */
export function sanitizeBio(raw: string): string {
  return sanitizeText(raw);
}

/**
 * Batch-sanitize an object's string fields in one pass.
 * Uses Object.keys of the input to preserve the exact shape.
 *
 * @example
 * const clean = sanitizeFields({ description, address }, sanitizeDescription);
 */
export function sanitizeFields<T extends Record<string, string>>(
  fields: T,
  sanitizer: (v: string) => string = sanitizeText
): T {
  return (Object.keys(fields) as Array<keyof T>).reduce<T>((acc, key) => {
    acc[key] = sanitizer(fields[key] as string) as T[keyof T];
    return acc;
  }, {} as T);
}
