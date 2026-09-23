import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import {
  getCalendarAdapter,
  type CalendarLanguage,
  type CalendarType,
} from "@/lib/calendar";
import { formatHebrewYear } from "@/lib/halacha/hebrew-numeral";
import { useDonationStore } from "@/lib/store";
import { formatLocalDate } from "@/lib/utils/local-date";

export type DateRangeSelectionType = "month" | "year" | "all" | "custom";

export interface DateRangeObject {
  startDate: string; // YYYY-MM-DD (local)
  endDate: string; // YYYY-MM-DD (local) - typically "today"
  label?: string;
}

// Helper: get "today" as a Date (local)
function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function calculateDateRange(
  dateRangeSelection: DateRangeSelectionType,
  customDateRange: DateRange | undefined,
  labels: Record<DateRangeSelectionType, string>,
  calendarType: CalendarType,
  language: CalendarLanguage,
): DateRangeObject {
  const today = todayLocal();
  const endDate = formatLocalDate(today);
  const adapter = getCalendarAdapter(calendarType);

  switch (dateRangeSelection) {
    case "month": {
      const monthKey = adapter.monthKey(endDate);
      return {
        startDate: adapter.startOfMonth(endDate),
        endDate,
        label: `${labels.month} (${adapter.monthLabel(monthKey, language)})`,
      };
    }
    case "year": {
      const representation = adapter.fromIsoDate(endDate);
      const yearLabel =
        calendarType === "hebrew"
          ? formatHebrewYear(representation.year)
          : String(representation.year);
      return {
        startDate: adapter.startOfYear(endDate),
        endDate,
        label: `${labels.year} (${yearLabel})`,
      };
    }
    case "all":
      return {
        startDate: "1970-01-01",
        endDate,
        label: labels.all,
      };
    case "custom": {
      if (customDateRange?.from) {
        const rawFrom = customDateRange.from;
        const rawTo = customDateRange.to ?? customDateRange.from;
        const start = rawFrom <= rawTo ? rawFrom : rawTo;
        const end = rawTo >= rawFrom ? rawTo : rawFrom;

        return {
          startDate: formatLocalDate(start),
          endDate: formatLocalDate(end),
          label: labels.custom,
        };
      }

      return {
        startDate: formatLocalDate(
          new Date(today.getFullYear(), today.getMonth(), 1),
        ),
        endDate,
        label: labels.custom,
      };
    }
    default: {
      const exhaustiveSelection: never = dateRangeSelection;
      void exhaustiveSelection;
      return {
        startDate: formatLocalDate(
          new Date(today.getFullYear(), today.getMonth(), 1),
        ),
        endDate,
        label: labels.month,
      };
    }
  }
}

export function useDateControls() {
  const { t } = useTranslation("dashboard");
  const { i18n } = useTranslation();
  const calendarType = useDonationStore(
    (state) => state.settings.calendarType,
  );
  const [dateRangeSelection, setDateRangeSelection] =
    useState<DateRangeSelectionType>("month");
  const [customDateRange, setCustomDateRange] = useState<
    DateRange | undefined
  >();

  const dateRangeLabels = useMemo<
    Record<DateRangeSelectionType, string>
  >(
    () => ({
      month: t("dateRange.month"), // e.g., "From start of month"
      year: t("dateRange.year"), // e.g., "From start of year"
      all: t("dateRange.all"), // e.g., "All time"
      custom: t("dateRange.custom"), // e.g., "Custom range"
    }),
    [t],
  );

  const activeDateRangeObject = useMemo<DateRangeObject>(
    () =>
      calculateDateRange(
        dateRangeSelection,
        customDateRange,
        dateRangeLabels,
        calendarType,
        i18n.language.startsWith("he") ? "he" : "en",
      ),
    [
      dateRangeSelection,
      customDateRange,
      dateRangeLabels,
      calendarType,
      i18n.language,
    ],
  );

  return {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
    customDateRange,
    setCustomDateRange,
  };
}
