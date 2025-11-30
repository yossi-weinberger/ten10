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

export function useDateControls() {
  const { t } = useTranslation("dashboard");
  const [dateRangeSelection, setDateRangeSelection] =
    useState<DateRangeSelectionType>("month");
  const [customDateRange, setCustomDateRange] = useState<
    DateRange | undefined
  >();

  const dateRangeLabels: Record<DateRangeSelectionType, string> = {
    month: t("dateRange.month"), // e.g., "From start of month"
    year: t("dateRange.year"), // e.g., "From start of year"
    all: t("dateRange.all"), // e.g., "All time"
    custom: t("dateRange.custom"), // e.g., "Custom range"
  };

  const activeDateRangeObject = useMemo<DateRangeObject>(() => {
    const today = todayLocal(); // endDate is always "today" for presets
    const endDateStr = formatLocalDate(today);

    let startDateStr = "";
    let label = "";

    switch (dateRangeSelection) {
      case "month": {
        const y = today.getFullYear();
        const m = today.getMonth(); // 0-based
        const startOfMonth = new Date(y, m, 1);
        startDateStr = formatLocalDate(startOfMonth);
        label = t("dateRange.month");
        break;
      }
      case "year": {
        const y = today.getFullYear();
        const startOfYear = new Date(y, 0, 1);
        startDateStr = formatLocalDate(startOfYear);
        label = t("dateRange.year");
        break;
      }
      case "all": {
        startDateStr = "1970-01-01";
        label = t("dateRange.all");
        break;
      }
      case "custom": {
        if (customDateRange?.from) {
          // If only one day selected, treat as single-day range
          const rawFrom = customDateRange.from;
          const rawTo = customDateRange.to ?? customDateRange.from;

          // Ensure correct order
          const start = rawFrom <= rawTo ? rawFrom : rawTo;
          const end = rawTo >= rawFrom ? rawTo : rawFrom;

          startDateStr = formatLocalDate(start);
          // For custom we respect the selected "to" (not forced to today)
          return {
            startDate: startDateStr,
            endDate: formatLocalDate(end),
            label: t("dateRange.custom"),
          };
        }
        // Fallback: current month → today
        const y = today.getFullYear();
        const m = today.getMonth();
        startDateStr = formatLocalDate(new Date(y, m, 1));
        label = t("dateRange.custom");
        break;
      }
      default: {
        // Default to "month → today"
        const y = today.getFullYear();
        const m = today.getMonth();
        startDateStr = formatLocalDate(new Date(y, m, 1));
        label = t("dateRange.month");
        break;
      }
    }

    return { startDate: startDateStr, endDate: endDateStr, label };
  }, [dateRangeSelection, customDateRange, t]);

  return {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
    customDateRange,
    setCustomDateRange,
  };
}
