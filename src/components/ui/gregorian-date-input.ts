import { format, parse } from "date-fns";

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

/** Accept only a full dd/MM/yyyy value. Partial years such as 12/09/20 do not round-trip. */
export function parseExactGregorianDateInput(value: string): Date | null {
  const parsedDate = parse(value, "dd/MM/yyyy", new Date(2020, 0, 1));
  if (!(parsedDate instanceof Date) || Number.isNaN(parsedDate.getTime())) {
    return null;
  }
  if (format(parsedDate, "dd/MM/yyyy") !== value) {
    return null;
  }
  return parsedDate;
}

/**
 * Parse typed Gregorian input for commit (change/blur/Enter).
 * Accepts d/M/yyyy, dd/MM/yyyy, d/M/yy, and dd/MM/yy.
 * Two-digit years become 20yy.
 */
export function parseFlexibleGregorianDateInput(
  value: string,
): GregorianDateParseResult {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { status: "empty" };
  }

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
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

export function formatGregorianDateInput(date: Date): string {
  return format(date, "dd/MM/yyyy");
}
