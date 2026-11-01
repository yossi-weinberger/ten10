import { format } from "date-fns";

/**
 * Two-digit years always expand to 20yy (not date-fns' 1969–2068 window).
 * Example: 01/01/99 becomes 2099-01-01, which is after MIN_TRANSACTION_DATE.
 */
const TWO_DIGIT_YEAR_BASE = 2000;

export type GregorianDateParseResult =
  | { status: "empty" }
  | { status: "partial" }
  | { status: "invalid_format" }
  | { status: "nonexistent" }
  | { status: "out_of_range" }
  | { status: "parsed"; date: Date };

function localDateIfValid(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || year < 100) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

const COMPLETE_FOUR_DIGIT_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
const FLEXIBLE_COMMIT_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/;

/**
 * Auto-format digits-only input by inserting slashes.
 * Example: "31102026" -> "31/10/2026", "311026" -> "31/10/26"
 * Returns the formatted string or the original if not applicable.
 */
export function autoFormatDigitsOnly(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  
  // 8 digits: DDMMYYYY
  if (digitsOnly.length === 8) {
    const day = digitsOnly.slice(0, 2);
    const month = digitsOnly.slice(2, 4);
    const year = digitsOnly.slice(4, 8);
    return `${day}/${month}/${year}`;
  }
  
  // 6 digits: DDMMYY
  if (digitsOnly.length === 6) {
    const day = digitsOnly.slice(0, 2);
    const month = digitsOnly.slice(2, 4);
    const year = digitsOnly.slice(4, 6);
    return `${day}/${month}/${year}`;
  }
  
  return value;
}

/**
 * Intelligently format date input as user types, adding slashes where appropriate.
 * Preserves caret position and only adds separators when characters are added.
 * Does not modify input on backspace or delete.
 */
export function formatAsUserTypes(
  currentValue: string,
  newValue: string,
  selectionStart: number | null
): { formatted: string; caretPos: number } {
  const defaultPos = selectionStart ?? newValue.length;
  
  // Detect paste: more than 1 character added at once, OR old value was replaced
  const charsAdded = newValue.length - currentValue.length;
  const digitsOnly = newValue.replace(/\D/g, "");
  const isPossiblePaste = charsAdded > 1 || charsAdded < 0 || (digitsOnly.length >= 6 && digitsOnly === newValue);

  if (isPossiblePaste) {
    // Check if it's a pure digits paste (6 or 8 digits)
    if (digitsOnly.length === 6 || digitsOnly.length === 8) {
      const formatted = autoFormatDigitsOnly(digitsOnly);
      return { formatted, caretPos: formatted.length };
    }
    // Other pastes/replacements: keep as-is
    return { formatted: newValue, caretPos: defaultPos };
  }
  
  // If text was deleted (shorter length), don't auto-format
  if (newValue.length < currentValue.length) {
    return { formatted: newValue, caretPos: defaultPos };
  }

  // Single character typed - check if we should auto-format
  const caretPos = selectionStart ?? newValue.length;
  
  // Detect if user typed a separator that was already auto-inserted
  // e.g. "31/" -> "31//" when user types "/" after auto-insert
  if (newValue.includes("//")) {
    // Remove the duplicate slash
    const cleaned = newValue.replace(/\/\//g, "/");
    return { formatted: cleaned, caretPos: cleaned.length };
  }
  
  // Map . and - to /
  const normalizedValue = newValue.replace(/[.-]/g, "/");
  
  // If user typed a separator, accept it (allows d/M format)
  if (normalizedValue !== newValue) {
    return { formatted: normalizedValue, caretPos };
  }
  
  // If the character was added at the end, check if we should auto-insert /
  const wasAddedAtEnd = caretPos === newValue.length;
  
  if (!wasAddedAtEnd) {
    // Mid-text edit: preserve as-is
    return { formatted: newValue, caretPos };
  }
  
  // Extract digits and separators
  const digits = newValue.replace(/\D/g, "");
  const separators = (newValue.match(/\//g) || []).length;
  
  // Auto-insert / after 2nd day digit (if no separators yet and exactly 2 digits)
  if (separators === 0 && digits.length === 2) {
    const formatted = `${digits}/`;
    return { formatted, caretPos: formatted.length };
  }
  
  // Auto-insert / after 2nd month digit (if only one separator and exactly 4 digits)
  if (separators === 1 && digits.length === 4) {
    const parts = newValue.split("/");
    if (parts.length === 2 && parts[0] && parts[1]) {
      const day = parts[0];
      const month = parts[1];
      const formatted = `${day}/${month}/`;
      return { formatted, caretPos: formatted.length };
    }
  }
  
  // Otherwise, keep the value as-is
  return { formatted: newValue, caretPos };
}

function parseSlashDate(
  value: string,
  pattern: RegExp,
): GregorianDateParseResult {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { status: "empty" };
  }

  const match = pattern.exec(trimmed);
  if (!match) {
    // Check if it looks like partial input (contains digits but doesn't match)
    const hasDigits = /\d/.test(trimmed);
    const separators = (trimmed.match(/[/.-]/g) || []).length;
    const digitsOnly = trimmed.replace(/\D/g, "");
    
    // Partial: has structure but incomplete
    // Examples: "31/10", "31", "31/", "15/03/20" (2-digit year), "15/03/202" (3-digit year)
    if (hasDigits) {
      if (separators === 1) {
        // Has one separator: "31/10" or "31/"
        return { status: "partial" };
      }
      if (separators === 2) {
        // Has two separators but didn't match - check year length
        const parts = trimmed.split(/[/.-]/);
        if (parts.length === 3 && parts[2]) {
          const yearLength = parts[2].replace(/\D/g, "").length;
          // Year is too short (1-3 digits) -> partial
          if (yearLength > 0 && yearLength < 4) {
            return { status: "partial" };
          }
        }
      }
      if (separators === 0 && digitsOnly.length < 6) {
        // Pure digits but less than 6 (can't be complete date)
        return { status: "partial" };
      }
    }
    
    return { status: "invalid_format" };
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = match[3];
  const year =
    rawYear.length === 2 ? TWO_DIGIT_YEAR_BASE + Number(rawYear) : Number(rawYear);
  
  const date = localDateIfValid(year, month, day);
  if (!date) {
    return { status: "nonexistent" };
  }
  
  // Check if date is before 2000-01-01 (out of range)
  const minDate = new Date(2000, 0, 1);
  if (date < minDate) {
    return { status: "out_of_range" };
  }
  
  return { status: "parsed", date };
}

/**
 * Live typing: accept only a complete d/M/yyyy or dd/MM/yyyy value.
 * Two-digit years stay unparsed so "15/03/20" is not rewritten to 2020.
 */
export function parseCompleteFourDigitGregorianDateInput(
  value: string,
): GregorianDateParseResult {
  return parseSlashDate(value, COMPLETE_FOUR_DIGIT_DATE);
}

/**
 * Commit (blur/Enter/submit) only. Accepts d/M/yyyy, dd/MM/yyyy, d/M/yy, and dd/MM/yy.
 * Two-digit years become 20yy. Accepts '/', '.', and '-' as separators.
 */
export function parseFlexibleGregorianDateInput(
  value: string,
): GregorianDateParseResult {
  return parseSlashDate(value, FLEXIBLE_COMMIT_DATE);
}

export function formatGregorianDateInput(date: Date): string {
  return format(date, "dd/MM/yyyy");
}
