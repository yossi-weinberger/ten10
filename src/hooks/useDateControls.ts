import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";

export type DateRangeSelectionType = "month" | "year" | "all" | "custom";

export interface DateRangeObject {
  startDate: string; // YYYY-MM-DD (local)
  endDate: string; // YYYY-MM-DD (local) - typically "today"
  label?: string;
}

// Helper: format Date as local YYYY-MM-DD without timezone conversion
function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Helper: get "today" as a Date (local)
function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function calculateGregorianDateRange(
  dateRangeSelection: DateRangeSelectionType,
  customDateRange: DateRange | undefined,
  labels: Record<DateRangeSelectionType, string>,
): DateRangeObject {
  const today = todayLocal();
  const endDate = formatLocalDate(today);

  switch (dateRangeSelection) {
    case "month":
      return {
        startDate: formatLocalDate(
          new Date(today.getFullYear(), today.getMonth(), 1),
        ),
        endDate,
        label: labels.month,
      };
    case "year":
      return {
        startDate: formatLocalDate(new Date(today.getFullYear(), 0, 1)),
        endDate,
        label: labels.year,
      };
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
      calculateGregorianDateRange(
        dateRangeSelection,
        customDateRange,
        dateRangeLabels,
      ),
    [dateRangeSelection, customDateRange, dateRangeLabels],
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
