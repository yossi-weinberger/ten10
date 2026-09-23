import {
  formatLocalDate,
  parseLocalDate,
} from "@/lib/utils/local-date";
import {
  advanceMonthlyRecurringDate,
  firstRecurringDueDate,
  rescheduleRecurringBillingDay,
  type CalendarType,
} from "@/lib/calendar";

export { formatLocalDate, parseLocalDate };

/** First calendar occurrence of dayOfMonth on or after startDate. */
export function firstDueDate(
  startDate: string,
  dayOfMonth: number,
  calendarType: CalendarType = "gregorian",
): string {
  return firstRecurringDueDate(startDate, calendarType, dayOfMonth);
}

/** When editing billing day, keep the same month/year and clamp the day. */
export function rescheduleBillingDayInMonth(
  nextDueDate: string,
  dayOfMonth: number,
  calendarType: CalendarType = "gregorian",
): string {
  return rescheduleRecurringBillingDay(
    nextDueDate,
    calendarType,
    dayOfMonth,
  );
}

/** Next monthly occurrence; avoids setMonth overflow (e.g. Jan 31 → Feb, not Mar). */
export function advanceMonthly(
  currentDate: string,
  dayOfMonth: number,
  calendarType: CalendarType = "gregorian",
): string {
  return advanceMonthlyRecurringDate(
    currentDate,
    calendarType,
    dayOfMonth,
  );
}
