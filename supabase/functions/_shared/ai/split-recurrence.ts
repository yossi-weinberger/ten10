import { resolveDateStruct } from "./split-date.ts";
import {
  advanceMonthlyRecurringDate,
  firstRecurringDueDate,
  getCalendarAdapter,
  type CalendarType,
  type RecurrenceFrequency,
} from "../calendar/index.ts";
import type { SplitItemInput } from "./split-schema.ts";

export interface ResolvedRecurrence {
  frequency: RecurrenceFrequency;
  calendarType: CalendarType;
  startDate: string | null;
  dayOfMonth: number | null;
  weekday: number | null;
  totalOccurrences: number | null;
  alreadyCharged: boolean;
}

function occurrencesUntilYearEnd(startDate: string, dayOfMonth: number, calendar: CalendarType): number | null {
  const adapter = getCalendarAdapter(calendar);
  const limit = adapter.addMonths(adapter.startOfYear(startDate), adapter.fromIsoDate(startDate).monthsInYear);
  const end = limit;
  let cursor = startDate;
  let count = 0;
  while (cursor < end && count < 24) {
    count += 1;
    cursor = advanceMonthlyRecurringDate(cursor, calendar, dayOfMonth);
  }
  return count > 0 ? count : null;
}

/** Start, day and count. Weekly and daily stay on the card and are not saved as monthly. */
export function resolveRecurrence(recurrence: NonNullable<SplitItemInput["recurrence"]>, today: string): ResolvedRecurrence {
  const calendar = recurrence.calendar;
  const day = recurrence.day_of_month;
  let startDate: string | null = null;

  if (recurrence.start_kind === "date" && recurrence.start) {
    startDate = resolveDateStruct(recurrence.start, today);
  } else if (recurrence.start_kind === "next_month") {
    const adapter = getCalendarAdapter(calendar);
    const anchor = adapter.addMonths(adapter.startOfMonth(today), 1);
    startDate = day !== null && day >= 1 && day <= 31
      ? firstRecurringDueDate(anchor, calendar, day)
      : adapter.startOfMonth(anchor);
  } else if (recurrence.start_kind === "this_month" || recurrence.start_kind === null) {
    startDate = day !== null && day >= 1 && day <= 31
      ? firstRecurringDueDate(today, calendar, day)
      : today;
  }

  let totalOccurrences: number | null = null;
  if (recurrence.end_kind === "count" && recurrence.end_count !== null && recurrence.end_count > 0) {
    totalOccurrences = Math.min(recurrence.end_count, 120);
  } else if (recurrence.end_kind === "end_of_year" && startDate && recurrence.frequency === "monthly") {
    const dueDay = day ?? Number(startDate.slice(8, 10));
    totalOccurrences = occurrencesUntilYearEnd(startDate, dueDay, calendar);
  } else if (recurrence.end_kind === "date" && recurrence.end && startDate && recurrence.frequency === "monthly") {
    const end = resolveDateStruct(recurrence.end, today);
    if (end && end >= startDate) {
      const dueDay = day ?? Number(startDate.slice(8, 10));
      let cursor = startDate;
      let count = 0;
      while (cursor <= end && count < 120) {
        count += 1;
        cursor = advanceMonthlyRecurringDate(cursor, calendar, dueDay);
      }
      totalOccurrences = count;
    }
  }

  return {
    frequency: recurrence.frequency,
    calendarType: calendar,
    startDate,
    dayOfMonth: day,
    weekday: recurrence.weekday,
    totalOccurrences,
    alreadyCharged: recurrence.already_charged,
  };
}
