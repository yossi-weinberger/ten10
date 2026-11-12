import { format } from "date-fns";
import { enUS, he } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import type { TableTransactionFilters } from "@/lib/tableTransactions/tableTransactions.types";
import { formatLocalDate } from "@/lib/utils/local-date";

const EN_DASH = "\u2013";

export type CompactDateFilterLabel =
  | { kind: "all" }
  | { kind: "month"; monthLabel: string }
  | { kind: "range"; label: string };

function isRealDate(value: Date | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function monthName(date: Date, language: string): string {
  const locale = language.toLowerCase().startsWith("he") ? he : enUS;
  return format(date, "LLLL", { locale });
}

function dayMonth(date: Date, withYear: boolean): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  if (withYear) {
    return `${day}.${month}.${date.getFullYear()}`;
  }
  return `${day}.${month}`;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWholeMonth(from: Date, to: Date): boolean {
  if (
    from.getFullYear() !== to.getFullYear() ||
    from.getMonth() !== to.getMonth() ||
    from.getDate() !== 1
  ) {
    return false;
  }
  const lastDay = new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate();
  return to.getDate() === lastDay;
}

function compareCalendar(a: Date, b: Date): number {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() - b.getFullYear();
  if (a.getMonth() !== b.getMonth()) return a.getMonth() - b.getMonth();
  return a.getDate() - b.getDate();
}

/**
 * Short date-cell value for the compact mobile filters panel.
 * A full calendar month uses the month name. Any other range uses
 * `D–D.M` in one month and `D.M–D.M` across months (year added when they differ).
 */
export function formatCompactDateFilterValue(
  range: { from?: Date; to?: Date } | undefined,
  language: string,
): CompactDateFilterLabel {
  const from = isRealDate(range?.from) ? range.from : undefined;
  const to = isRealDate(range?.to) ? range.to : undefined;

  if (!from && !to) {
    return { kind: "all" };
  }
  if (from && !to) {
    return { kind: "range", label: dayMonth(from, false) };
  }
  if (!from && to) {
    return { kind: "range", label: dayMonth(to, false) };
  }
  if (!from || !to) {
    return { kind: "all" };
  }

  let start = from;
  let end = to;
  if (compareCalendar(start, end) > 0) {
    start = to;
    end = from;
  }

  if (isSameCalendarDay(start, end)) {
    return { kind: "range", label: dayMonth(start, false) };
  }

  if (isWholeMonth(start, end)) {
    return { kind: "month", monthLabel: monthName(start, language) };
  }

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return {
      kind: "range",
      label: `${start.getDate()}${EN_DASH}${end.getDate()}.${end.getMonth() + 1}`,
    };
  }

  const withYear = start.getFullYear() !== end.getFullYear();
  return {
    kind: "range",
    label: `${dayMonth(start, withYear)}${EN_DASH}${dayMonth(end, withYear)}`,
  };
}

export function serializeTransactionDateRange(
  dateRange: DateRange | undefined,
): TableTransactionFilters["dateRange"] {
  return {
    from: dateRange?.from ? formatLocalDate(dateRange.from) : null,
    to: dateRange?.to ? formatLocalDate(dateRange.to) : null,
  };
}
