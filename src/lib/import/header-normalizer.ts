const BIDI_CONTROL = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/**
 * Clean a column header for display/storage: strip BOM, bidi control chars,
 * normalise Hebrew punctuation to ASCII equivalents, and trim whitespace.
 * Preserves original casing — use for keys and display labels.
 */
export function cleanHeaderName(header: string): string {
  return header
    .replace(/^\uFEFF/, "")     // BOM
    .replace(BIDI_CONTROL, "")  // invisible bidi control characters
    .replace(/\u05F4/g, '"')    // ״ (HEBREW PUNCTUATION GERSHAYIM) → "
    .replace(/\u05F3/g, "'")    // ׳ (HEBREW PUNCTUATION GERESH) → '
    .trim();
}

/**
 * Normalize a column header for alias matching: clean + lowercase.
 * Use when comparing against FIELD_ALIASES or TEN10_TEMPLATE_HEADERS.
 */
export function normalizeHeaderName(header: string): string {
  return cleanHeaderName(header).toLowerCase();
}
