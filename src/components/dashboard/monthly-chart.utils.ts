import { format, parse } from "date-fns";
import { enUS, he } from "date-fns/locale";
import type { MonthlyChartDataPoint } from "@/components/charts/area-chart-interactive";
import {
  getCalendarAdapter,
  type CalendarLanguage,
  type CalendarType,
  type HebrewEnglishDateFormat,
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
  calendarType: CalendarType;
  loadedCalendarType: CalendarType | null;
}

export function getLoadedChartCalendarType(
  data: readonly Pick<MonthlyDataPoint, "cache_key">[],
): CalendarType | null {
  const prefix = data[0]?.cache_key.split(":")[0];
  switch (prefix) {
    case "hebrew":
    case "gregorian":
      return prefix;
    case undefined:
      return null;
    default:
      return null;
  }
}

export function chartBucketsNeedReload(
  loadedCalendarType: CalendarType | null,
  calendarType: CalendarType,
): boolean {
  return loadedCalendarType !== null && loadedCalendarType !== calendarType;
}

export function shouldLoadInitialChart(
  state: InitialChartLoadState,
): boolean {
  const canFetch =
    state.platformReady &&
    (state.platform === "desktop" ||
      (state.platform === "web" && Boolean(state.userId)));

  if (!canFetch || state.isLoading) {
    return false;
  }

  if (chartBucketsNeedReload(state.loadedCalendarType, state.calendarType)) {
    return true;
  }

  return (
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
  hebrewEnglishFormat?: HebrewEnglishDateFormat,
): MonthlyChartDataPoint[] {
  const locale = language === "he" ? he : enUS;
  const calendarLanguage: CalendarLanguage =
    language === "he" ? "he" : "en";
  const adapter = getCalendarAdapter(calendarType);

  return data
    .slice()
    .filter((item) => item.cache_key.startsWith(`${calendarType}:`))
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
          : adapter.monthLabel(item.period_key, calendarLanguage, {
              hebrewEnglishFormat,
            }),
      income: item.income,
      donations: item.donations,
      expenses: item.expenses,
    }));
}
