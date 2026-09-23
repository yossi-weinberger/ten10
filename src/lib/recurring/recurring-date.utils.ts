import {
  formatLocalDate,
  parseLocalDate,
} from "@/lib/utils/local-date";

export { formatLocalDate, parseLocalDate };

/** First calendar occurrence of dayOfMonth on or after startDate. */
export function firstDueDate(startDate: string, dayOfMonth: number): string {
  const start = parseLocalDate(startDate);
  const year = start.getFullYear();
  const month = start.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const candidate = new Date(year, month, Math.min(dayOfMonth, daysInMonth));

  if (candidate >= start) {
    return formatLocalDate(candidate);
  }

  return advanceMonthly(formatLocalDate(start), dayOfMonth);
}

/** When editing billing day, keep the same month/year and clamp the day. */
export function rescheduleBillingDayInMonth(
  nextDueDate: string,
  dayOfMonth: number
): string {
  const current = parseLocalDate(nextDueDate);
  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return formatLocalDate(
    new Date(year, month, Math.min(dayOfMonth, daysInMonth))
  );
}

/** Next monthly occurrence; avoids setMonth overflow (e.g. Jan 31 → Feb, not Mar). */
export function advanceMonthly(currentDate: string, dayOfMonth: number): string {
  const current = parseLocalDate(currentDate);
  let targetMonth = current.getMonth() + 1;
  let targetYear = current.getFullYear();
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  return formatLocalDate(
    new Date(targetYear, targetMonth, Math.min(dayOfMonth, daysInMonth))
  );
}
