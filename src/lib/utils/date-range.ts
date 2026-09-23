import {
  getCalendarAdapter,
  type CalendarType,
} from "@/lib/calendar";
import type { DateRangeSelectionType } from "@/hooks/useDateControls";
import { formatLocalDate, parseLocalDate } from "./local-date";

export interface PreviousPeriodContext {
  selection: DateRangeSelectionType;
  calendarType: CalendarType;
}

/**
 * Compute the "previous period" date range of the same length as the active one.
 * Used for delta % comparison on KPI cards.
 */
export function getPreviousPeriodRange(
  startDate: string,
  endDate: string,
  context: PreviousPeriodContext,
): { startDate: string; endDate: string } | null {
  const adapter = getCalendarAdapter(context.calendarType);

  switch (context.selection) {
    case "month": {
      const previousMonthDate = adapter.addMonths(startDate, -1);
      return {
        startDate: adapter.startOfMonth(previousMonthDate),
        endDate: adapter.endOfMonth(previousMonthDate),
      };
    }
    case "year": {
      const currentYear = adapter.fromIsoDate(startDate).year;
      const previousYearStart = adapter.toIsoDate({
        year: currentYear - 1,
        month: 1,
        day: 1,
      });
      const previousYearEnd = new Date(
        parseLocalDate(startDate).getFullYear(),
        parseLocalDate(startDate).getMonth(),
        parseLocalDate(startDate).getDate() - 1,
      );
      return {
        startDate: previousYearStart,
        endDate: formatLocalDate(previousYearEnd),
      };
    }
    case "all":
      return null;
    case "custom":
      break;
    default: {
      const exhaustiveSelection: never = context.selection;
      return exhaustiveSelection;
    }
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  const startOrdinal = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endOrdinal = Date.UTC(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
  );
  const inclusiveDays = Math.round(
    (endOrdinal - startOrdinal) / (24 * 60 * 60 * 1000),
  ) + 1;
  const prevEnd = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - 1,
  );
  const prevStart = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() - inclusiveDays,
  );

  return {
    startDate: formatLocalDate(prevStart),
    endDate: formatLocalDate(prevEnd),
  };
}
