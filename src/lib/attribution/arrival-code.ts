export const ARRIVAL_CODE_MAX_LENGTH = 32;
export const ARRIVAL_CODE_PATTERN = /^[A-Z0-9_-]+$/;

/**
 * Trim, uppercase, and accept only `[A-Z0-9_-]` up to 32 chars.
 * Returns null for empty or invalid input so callers can omit the field.
 */
export function normalizeArrivalCode(
  raw: string | null | undefined
): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.length > ARRIVAL_CODE_MAX_LENGTH) return null;
  if (!ARRIVAL_CODE_PATTERN.test(normalized)) return null;
  return normalized;
}

/** Live-input sanitizer: strip illegal characters and cap length. */
export function sanitizeArrivalCodeInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, ARRIVAL_CODE_MAX_LENGTH);
}
