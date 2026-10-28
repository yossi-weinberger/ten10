/**
 * Words for reading a donation recipient, in Hebrew and English.
 * Matching data, not UI copy.
 */

export const DONATION_VERBS = ["תרמתי", "נתתי", "הפרשתי", "donated", "gave"] as const;

export const DONATION_NOUNS = ["תרומה קבועה", "תרומה", "donation", "pledge"] as const;

/** Not a recipient on their own: «לצדקה», "to charity". */
export const GENERIC_RECIPIENT_WORDS = ["צדקה", "מעשר", "תרומה", "charity", "tzedaka", "tzedakah"] as const;

/** Words that start with ל but name no one: «תגדיר לי», «ב־10 לחודש», «למשך». */
export const LAMED_NON_NAMES = [
  "לי",
  "לך",
  "לו",
  "לה",
  "לנו",
  "לכם",
  "להם",
  "לפי",
  "לא",
  "לכל",
  "לפני",
  "לאחר",
  "למשך",
  "לחודש",
  "לשבוע",
  "לשנה",
] as const;

/** A recipient name ends before these words. */
export const RECIPIENT_END_WORDS = [
  "כל",
  "בכל",
  "כי",
  "אבל",
  "עבור",
  "בשביל",
  "על",
  "עד",
  "החל",
  "and",
  "but",
  "because",
  "for",
  "on",
  "in",
  "at",
  "by",
  "via",
  "with",
  "from",
  "until",
  "till",
  "this",
  "next",
  "each",
  "every",
] as const;
