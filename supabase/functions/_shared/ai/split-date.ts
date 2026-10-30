/** Calendar dates from a closed structure. The model does not do this arithmetic. */

export type DateKind = "days_ago" | "last_weekday" | "day_of_month" | "exact";

export interface DateStruct {
  kind: DateKind;
  n: number | null;
  weekday: number | null;
  day: number | null;
  month: number | null;
  year: number | null;
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  return isoParts(value) !== null;
}

function isoParts(value: string): { year: number; month: number; day: number } | null {
  const match = ISO.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

export function addIsoDays(isoDate: string, days: number): string | null {
  const parts = isoParts(isoDate);
  if (!parts) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return date.toISOString().slice(0, 10);
}

function isoFromParts(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function weekdayOf(isoDate: string): number | null {
  const parts = isoParts(isoDate);
  if (!parts) return null;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

/** More than a year before today, or any day after today, is not a transaction date. */
export function dateInWindow(isoDate: string, today: string): boolean {
  if (!isIsoDate(isoDate) || !isIsoDate(today)) return false;
  if (isoDate > today) return false;
  const oldest = addIsoDays(today, -366);
  return oldest !== null && isoDate >= oldest;
}

/**
 * `days_ago` 1 is yesterday. `last_weekday` 0 is last Sunday, never today.
 * A day-of-month or an exact date without a year that lands in the future
 * moves to the previous month or year. 31 February is null.
 */
export function resolveDateStruct(date: DateStruct, today: string): string | null {
  if (!isIsoDate(today)) return null;
  const parts = isoParts(today);
  if (!parts) return null;

  if (date.kind === "days_ago") {
    if (date.n === null || !Number.isInteger(date.n) || date.n < 0 || date.n > 366) return null;
    const resolved = addIsoDays(today, -date.n);
    return resolved !== null && dateInWindow(resolved, today) ? resolved : null;
  }

  if (date.kind === "last_weekday") {
    if (date.weekday === null || !Number.isInteger(date.weekday) || date.weekday < 0 || date.weekday > 6) {
      return null;
    }
    const current = weekdayOf(today);
    if (current === null) return null;
    let delta = (current - date.weekday + 7) % 7;
    if (delta === 0) delta = 7;
    const resolved = addIsoDays(today, -delta);
    return resolved !== null && dateInWindow(resolved, today) ? resolved : null;
  }

  if (date.kind === "day_of_month" || (date.kind === "exact" && date.year === null)) {
    if (date.day === null || !Number.isInteger(date.day)) return null;
    let year = parts.year;
    let month = date.month ?? parts.month;
    if (!Number.isInteger(month) || month < 1 || month > 12) return null;
    let resolved = isoFromParts(year, month, date.day);
    if (date.month === null && (resolved === null || resolved > today)) {
      month -= 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      resolved = isoFromParts(year, month, date.day);
    } else if (date.month !== null && resolved !== null && resolved > today) {
      resolved = isoFromParts(year - 1, month, date.day);
    }
    return resolved !== null && dateInWindow(resolved, today) ? resolved : null;
  }

  if (date.kind === "exact") {
    if (date.year === null || date.month === null || date.day === null) return null;
    const resolved = isoFromParts(date.year, date.month, date.day);
    return resolved !== null && dateInWindow(resolved, today) ? resolved : null;
  }

  const unreachable: never = date.kind;
  return unreachable;
}

/** The calendar day of `instant` in `timeZone`. Null when the zone is not real. */
export function todayInZone(instant: Date, timeZone: string): string | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (!year || !month || !day) return null;
    const iso = `${year}-${month}-${day}`;
    return isIsoDate(iso) ? iso : null;
  } catch {
    return null;
  }
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function weekdayName(isoDate: string): string | null {
  const weekday = weekdayOf(isoDate);
  return weekday === null ? null : WEEKDAYS[weekday];
}
