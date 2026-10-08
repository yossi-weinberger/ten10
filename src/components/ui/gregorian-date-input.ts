import { format } from "date-fns";

/**
 * Two-digit years always expand to 20yy (not date-fns' 1969–2068 window).
 * Example: 01/01/99 becomes 2099-01-01, which is after MIN_TRANSACTION_DATE.
 */
const TWO_DIGIT_YEAR_BASE = 2000;

export type GregorianDateParseResult =
  | { status: "empty" }
  | { status: "invalid" }
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

const COMPLETE_FOUR_DIGIT_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const FLEXIBLE_COMMIT_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/;

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
    return { status: "invalid" };
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = match[3];
  const year =
    rawYear.length === 2 ? TWO_DIGIT_YEAR_BASE + Number(rawYear) : Number(rawYear);
  const date = localDateIfValid(year, month, day);
  if (!date) {
    return { status: "invalid" };
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
 * Two-digit years become 20yy.
 */
export function parseFlexibleGregorianDateInput(
  value: string,
): GregorianDateParseResult {
  return parseSlashDate(value, FLEXIBLE_COMMIT_DATE);
}

export function formatGregorianDateInput(date: Date): string {
  return format(date, "dd/MM/yyyy");
}
