import { addIsoDays, resolveDateStruct, type DateStruct } from "./split-date.ts";
import { getCalendarAdapter, type CalendarType } from "../calendar/index.ts";
import type { SplitQuestionInput } from "./split-schema.ts";

export interface PeriodBounds {
  from: string | null;
  to: string | null;
}

function endOfYear(isoDate: string, calendar: CalendarType): string | null {
  const adapter = getCalendarAdapter(calendar);
  const start = adapter.startOfYear(isoDate);
  const months = adapter.fromIsoDate(start).monthsInYear;
  const next = adapter.addMonths(start, months);
  return addIsoDays(next, -1);
}

function yearStart(year: number, calendar: CalendarType): string | null {
  try {
    return getCalendarAdapter(calendar).toIsoDate({ year, month: 1, day: 1 });
  } catch {
    return null;
  }
}

/** Turns the closed period into inclusive dates. A period the calendar rejects is null. */
export function periodBounds(period: SplitQuestionInput["period"], today: string): PeriodBounds | null {
  const calendar = period.calendar;
  if (period.kind === "all") return { from: null, to: null };

  if (period.kind === "year") {
    if (period.year === null) return null;
    const start = yearStart(period.year, calendar);
    if (!start) return null;
    const from = getCalendarAdapter(calendar).startOfYear(start);
    const to = endOfYear(from, calendar);
    return to ? { from, to } : null;
  }

  if (period.kind === "month") {
    if (period.year === null || period.month === null) return null;
    try {
      const adapter = getCalendarAdapter(calendar);
      const anchor = adapter.toIsoDate({ year: period.year, month: period.month, day: 1 });
      return { from: adapter.startOfMonth(anchor), to: adapter.endOfMonth(anchor) };
    } catch {
      return null;
    }
  }

  if (period.kind === "last_n_months") {
    if (period.n === null || period.n < 1 || period.n > 36) return null;
    try {
      const from = getCalendarAdapter(calendar).addMonths(today, -period.n);
      return { from, to: today };
    } catch {
      return null;
    }
  }

  if (period.kind === "range") {
    const from = period.from ? resolveDateStruct(period.from, today) : null;
    const to = period.to ? resolveDateStruct(period.to, today) : null;
    if (!from || !to || from > to) return null;
    return { from, to };
  }

  const unreachable: never = period.kind;
  return unreachable;
}

export type { DateStruct };
