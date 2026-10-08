import {
  getCalendarAdapter,
  type CalendarType,
} from "@/lib/calendar";
import type { DateRangeSelectionType } from "@/hooks/useDateControls";
import { formatLocalDate, parseLocalDate } from "./local-date";

/**
 * Inclusive lower bound for the All-time dashboard filter.
 * Sent as a real date string so current prod RPCs that use
 * `date BETWEEN p_start_date::date AND p_end_date::date` still return
 * every stored row (including pre-1970). The '0001-01-01' sentinel
 * already works in SQLite string comparison.
 */
export const ALL_TIME_START_DATE = "0001-01-01";

export function isAllTimeStartDate(startDate: string): boolean {
  return startDate === ALL_TIME_START_DATE;
}

export interface PreviousPeriodContext {
  selection: DateRangeSelectionType;
  calendarType: CalendarType;
}

/**
 * Previous period for KPI delta badges.
 * Month and year presets use the same elapsed day in the previous period.
 * Custom ranges keep the same inclusive length.
 */
export function getPreviousPeriodRange(
  startDate: string,
  endDate: string,
  context: PreviousPeriodContext,
): { startDate: string; endDate: string } | null {
  const adapter = getCalendarAdapter(context.calendarType);

  switch (context.selection) {
    case "month": {
      const current = adapter.fromIsoDate(endDate);
      const previousMonthStart = adapter.startOfMonth(adapter.addMonths(startDate, -1));
      const previous = adapter.fromIsoDate(previousMonthStart);
      return {
        startDate: previousMonthStart,
        endDate: adapter.toIsoDate(
          {
            year: previous.year,
            month: previous.month,
            day: current.day,
          },
          "constrain",
        ),
      };
    }
    case "year": {
      const current = adapter.fromIsoDate(endDate);
      return {
        startDate: adapter.toIsoDate({
          year: current.year - 1,
          month: 1,
          day: 1,
        }),
        endDate: adapter.toIsoDate(
          {
            year: current.year - 1,
            monthCode: current.monthCode,
            day: current.day,
          },
          "constrain",
        ),
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
