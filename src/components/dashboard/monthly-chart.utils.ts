import { format, parse } from "date-fns";
import { enUS, he } from "date-fns/locale";
import type { MonthlyChartDataPoint } from "@/components/charts/area-chart-interactive";
import {
  getCalendarAdapter,
  type CalendarLanguage,
  type CalendarType,
} from "@/lib/calendar";
import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";

interface InitialChartLoadState {
  platformReady: boolean;
  platform: "web" | "desktop" | "loading" | undefined;
  userId: string | undefined;
  isLoading: boolean;
  hasError: boolean;
  initialLoadAttempted: boolean;
  dataLength: number;
}

export function shouldLoadInitialChart(
  state: InitialChartLoadState,
): boolean {
  const canFetch =
    state.platformReady &&
    (state.platform === "desktop" ||
      (state.platform === "web" && Boolean(state.userId)));

  return (
    canFetch &&
    !state.isLoading &&
    !state.hasError &&
    (!state.initialLoadAttempted || state.dataLength === 0)
  );
}

export function getPreviousChartAnchor(
  earliestPeriodStart: string,
  calendarType: CalendarType,
): string {
  return getCalendarAdapter(calendarType).addMonths(
    earliestPeriodStart,
    -1,
  );
}

export function formatMonthlyChartData(
  data: readonly MonthlyDataPoint[],
  calendarType: CalendarType,
  language: string,
): MonthlyChartDataPoint[] {
  const locale = language === "he" ? he : enUS;
  const calendarLanguage: CalendarLanguage =
    language === "he" ? "he" : "en";
  const adapter = getCalendarAdapter(calendarType);

  return data
    .slice()
    .sort((itemA, itemB) =>
      itemA.period_start.localeCompare(itemB.period_start),
    )
    .map((item) => ({
      month:
        calendarType === "gregorian"
          ? format(
              parse(item.period_key, "yyyy-MM", new Date()),
              "MMM yyyy",
              { locale },
            )
          : adapter.monthLabel(item.period_key, calendarLanguage),
      income: item.income,
      donations: item.donations,
      expenses: item.expenses,
    }));
}
