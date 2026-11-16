/** Client-side computation of AI limit reset times based on fixed SQL windows. */

import type { LimitKind } from "./limit-reason";

/**
 * Returns the next reset timestamp for a given limit kind.
 * - daily_limit: next 00:00 UTC
 * - quota_exhausted: 00:00 UTC on 1st of next month
 * - rate_limited: null (no fixed reset time shown)
 */
export function computeLimitReset(kind: LimitKind): Date | null {
  const now = new Date();
  
  switch (kind) {
    case "daily_limit": {
      const nextDay = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0,
        0,
        0,
        0
      ));
      return nextDay;
    }
    case "quota_exhausted": {
      const nextMonth = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1,
        0,
        0,
        0,
        0
      ));
      return nextMonth;
    }
    case "rate_limited":
      return null;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

/**
 * Formats the reset time for a daily limit as a local time string.
 * Example: "02:00" or "2:00 AM" depending on locale.
 */
export function formatDailyResetTime(resetDate: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jerusalem",
  }).format(resetDate);
}

/**
 * Formats the reset date for a monthly quota as a local date string.
 * Example: "1.12.2026" or "12/1/2026" depending on locale.
 */
export function formatMonthlyResetDate(resetDate: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  }).format(resetDate);
}
