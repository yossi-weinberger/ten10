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
  | { status: "out_of_range"; date: Date }
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
const SEPARATOR_CHAR = /[./-]/;

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

function diffEdit(oldValue: string, newValue: string): {
  prefix: number;
  inserted: string;
  removed: string;
} {
  let prefix = 0;
  while (
    prefix < oldValue.length &&
    prefix < newValue.length &&
    oldValue[prefix] === newValue[prefix]
  ) {
    prefix += 1;
  }
  let suffix = 0;
  while (
    suffix < oldValue.length - prefix &&
    suffix < newValue.length - prefix &&
    oldValue[oldValue.length - 1 - suffix] === newValue[newValue.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return {
    prefix,
    inserted: newValue.slice(prefix, newValue.length - suffix),
    removed: oldValue.slice(prefix, oldValue.length - suffix),
  };
}

function isPossiblePaste(inserted: string, removed: string): boolean {
  // Multi-character insert, or a selection replaced with more characters than removed.
  return inserted.length > 1 || (removed.length > 0 && inserted.length > removed.length);
}

/**
 * iOS numeric keypad / digits-only grouping.
 * Day 4–9 pads immediately; month 2–9 pads immediately; month 1 stays
 * ambiguous until digit-count resolve (5 after day → 01+YYYY, 6 → MM+YYYY).
 * Four digits after a 2-digit day starting 2–9 are the year (15+2026 → 15/02/2026).
 * Pass `complete` on paste/blur so 6 digits with a valid MM become DD/MM/YY.
 */
export function formatIosDigitSequence(digits: string, complete = false): string {
  if (digits.length === 0) {
    return "";
  }

  let index = 0;
  let day: string;
  const first = digits[0]!;

  if (first >= "4" && first <= "9") {
    day = `0${first}`;
    index = 1;
  } else if (digits.length === 1) {
    return digits;
  } else {
    day = digits.slice(0, 2);
    index = 2;
  }

  const rest = digits.slice(index);
  if (rest.length === 0) {
    return `${day}/`;
  }

  const monthFirst = rest[0]!;

  if (monthFirst >= "2" && monthFirst <= "9") {
    const month = `0${monthFirst}`;
    // 4 digits after the day: those digits are the year (month pad is extra).
    if (rest.length === 4) {
      return `${day}/${month}/${rest}`;
    }
    const year = rest.slice(1);
    if (year.length === 0) {
      return `${day}/${month}/`;
    }
    return `${day}/${month}/${year}`;
  }

  if (monthFirst === "0") {
    if (rest.length === 1) {
      return `${day}/0`;
    }
    const month = rest.slice(0, 2);
    const year = rest.slice(2);
    if (year.length === 0) {
      return `${day}/${month}/`;
    }
    return `${day}/${month}/${year}`;
  }

  // Month starts with 1 (01 vs 10–12).
  if (rest.length === 1) {
    return `${day}/1`;
  }

  const monthSecond = rest[1]!;
  if (monthSecond >= "3" && monthSecond <= "9") {
    return `${day}/01/${rest.slice(1)}`;
  }

  // 1 + 0/1/2: do not insert a slash eagerly.
  if (rest.length >= 6) {
    return `${day}/${rest.slice(0, 2)}/${rest.slice(2, 6)}`;
  }
  if (complete && rest.length === 5) {
    return `${day}/01/${rest.slice(1)}`;
  }
  if (complete && rest.length === 4) {
    const month = rest.slice(0, 2);
    const year = rest.slice(2);
    const monthNum = Number(month);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${day}/${month}/${year}`;
    }
  }

  return `${day}/${rest}`;
}

function caretAfter(formatted: string): number {
  return formatted.length;
}

function swallowTypedSeparator(
  currentValue: string,
  prefix: number,
): { formatted: string; caretPos: number } | null {
  if (currentValue[prefix] === "/") {
    return { formatted: currentValue, caretPos: prefix + 1 };
  }
  if (prefix > 0 && currentValue[prefix - 1] === "/") {
    return { formatted: currentValue, caretPos: prefix };
  }
  return null;
}

function collapseDuplicateSlashes(
  value: string,
  caret: number,
): { formatted: string; caretPos: number } {
  const formatted = value.replace(/\/{2,}/g, "/");
  if (formatted === value) {
    return { formatted: value, caretPos: Math.min(caret, value.length) };
  }

  let surviving = 0;
  let lastWasSlash = false;
  for (let i = 0; i < caret && i < value.length; i += 1) {
    const isSlash = value[i] === "/";
    if (isSlash && lastWasSlash) {
      continue;
    }
    surviving += 1;
    lastWasSlash = isSlash;
  }
  return { formatted, caretPos: surviving };
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
  const { prefix, inserted, removed } = diffEdit(currentValue, newValue);

  if (newValue.length < currentValue.length && inserted.length === 0) {
    return { formatted: newValue, caretPos: defaultPos };
  }

  if (isPossiblePaste(inserted, removed)) {
    const normalized = newValue.replace(/[.-]/g, "/");
    const digitsOnly = normalized.replace(/\D/g, "");
    if (digitsOnly.length > 0 && digitsOnly === normalized.replace(/\//g, "")) {
      if (digitsOnly.length >= 6 && digitsOnly.length <= 8) {
        const formatted = formatIosDigitSequence(digitsOnly, true);
        return { formatted, caretPos: caretAfter(formatted) };
      }
    }
    return { formatted: normalized, caretPos: defaultPos };
  }

  const normalizedInserted = inserted.replace(/[.-]/g, "/");
  const normalizedNew = newValue.replace(/[.-]/g, "/");

  if (SEPARATOR_CHAR.test(inserted) && normalizedInserted === "/") {
    const swallowed = swallowTypedSeparator(currentValue, prefix);
    if (swallowed) {
      return swallowed;
    }
    return collapseDuplicateSlashes(normalizedNew, defaultPos);
  }

  if (normalizedNew.includes("//")) {
    return collapseDuplicateSlashes(normalizedNew, defaultPos);
  }

  const caretPos = selectionStart ?? normalizedNew.length;
  const wasAddedAtEnd = caretPos === normalizedNew.length;
  const typedDigitBeforeSlash =
    inserted.length === 1 &&
    /\d/.test(inserted) &&
    currentValue[prefix] === "/";

  const digits = normalizedNew.replace(/\D/g, "");
  const slashCount = (normalizedNew.match(/\//g) || []).length;
  const parts = normalizedNew.split("/");
  const dayPart = parts[0] ?? "";
  const isLooseDay =
    slashCount >= 1 &&
    dayPart.length === 1 &&
    dayPart >= "1" &&
    dayPart <= "3";
  const isLooseMonth = slashCount >= 2 && parts[1]?.length === 1;

  if (isLooseDay || isLooseMonth) {
    return { formatted: normalizedNew, caretPos };
  }

  if (!wasAddedAtEnd && !typedDigitBeforeSlash) {
    return { formatted: normalizedNew, caretPos };
  }

  if (digits.length === 0) {
    return { formatted: normalizedNew, caretPos };
  }

  if (slashCount >= 2) {
    const month = parts[1] ?? "";
    const year = parts[2] ?? "";
    const paddedMonth = /^0[2-9]$/.test(month);
    if (paddedMonth && year.length === 3 && year[0] === "0") {
      const resolved = `${parts[0]}/${month}/${month[1]}${year}`;
      return { formatted: resolved, caretPos: caretAfter(resolved) };
    }
    return { formatted: normalizedNew, caretPos };
  }

  const formatted = formatIosDigitSequence(digits);
  return { formatted, caretPos: caretAfter(formatted) };
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
    const hasDigits = /\d/.test(trimmed);
    const separators = (trimmed.match(/[/.-]/g) || []).length;
    const digitsOnly = trimmed.replace(/\D/g, "");

    if (hasDigits) {
      if (separators === 1) {
        return { status: "partial" };
      }
      if (separators === 2) {
        const parts = trimmed.split(/[/.-]/);
        if (parts.length === 3 && parts[2]) {
          const yearLength = parts[2].replace(/\D/g, "").length;
          if (yearLength > 0 && yearLength < 4) {
            return { status: "partial" };
          }
        }
      }
      if (separators === 0 && digitsOnly.length < 6) {
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

  const minDate = new Date(2000, 0, 1);
  if (date < minDate) {
    return { status: "out_of_range", date };
  }

  return { status: "parsed", date };
}

function tryParseIosDigits(value: string, pattern: RegExp): GregorianDateParseResult | null {
  const trimmed = value.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  const slashCount = (trimmed.match(/\//g) || []).length;
  if (
    digitsOnly.length < 6 ||
    slashCount > 1 ||
    !/^[\d/]*$/.test(trimmed)
  ) {
    return null;
  }

  const formatted = formatIosDigitSequence(digitsOnly, true);
  if (formatted === trimmed) {
    return null;
  }

  const resolved = parseSlashDate(formatted, pattern);
  if (
    resolved.status === "parsed" ||
    resolved.status === "out_of_range" ||
    resolved.status === "nonexistent"
  ) {
    return resolved;
  }
  return null;
}

/**
 * Live typing: accept only a complete d/M/yyyy or dd/MM/yyyy value.
 * Two-digit years stay unparsed so "15/03/20" is not rewritten to 2020.
 */
export function parseCompleteFourDigitGregorianDateInput(
  value: string,
): GregorianDateParseResult {
  return tryParseIosDigits(value, COMPLETE_FOUR_DIGIT_DATE) ?? parseSlashDate(value, COMPLETE_FOUR_DIGIT_DATE);
}

/**
 * Commit (blur/Enter/submit) only. Accepts d/M/yyyy, dd/MM/yyyy, d/M/yy, and dd/MM/yy.
 * Two-digit years become 20yy. Accepts '/', '.', and '-' as separators.
 */
export function parseFlexibleGregorianDateInput(
  value: string,
): GregorianDateParseResult {
  return tryParseIosDigits(value, FLEXIBLE_COMMIT_DATE) ?? parseSlashDate(value, FLEXIBLE_COMMIT_DATE);
}

export function formatGregorianDateInput(date: Date): string {
  return format(date, "dd/MM/yyyy");
}
