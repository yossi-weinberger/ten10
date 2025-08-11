import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export type DateRangeSelectionType = "month" | "year" | "all";

export interface DateRangeObject {
  startDate: string;
  endDate: string;
  label?: string;
}

export function useDateControls() {
  const { t } = useTranslation("dashboard");
  const [dateRangeSelection, setDateRangeSelection] =
    useState<DateRangeSelectionType>("month");

  const dateRangeLabels: Record<DateRangeSelectionType, string> = {
    month: t("dateRange.month"),
    year: t("dateRange.year"),
    all: t("dateRange.all"),
  };

  const activeDateRangeObject = useMemo((): DateRangeObject => {
    const today = new Date();
    let startDateStr: string;
    let endDateStr: string;
    let label: string = "";

    switch (dateRangeSelection) {
      case "month":
        startDateStr = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDateStr = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        label = t("dateRange.month");
        break;
      case "year":
        startDateStr = new Date(today.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        endDateStr = new Date(today.getFullYear(), 11, 31)
          .toISOString()
          .split("T")[0];
        label = t("dateRange.year");
        break;
      case "all":
        startDateStr = "1970-01-01";
        endDateStr = new Date().toISOString().split("T")[0];
        label = t("dateRange.all");
        break;
      default:
        startDateStr = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDateStr = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        label = t("dateRange.month");
    }
    return { startDate: startDateStr, endDate: endDateStr, label };
  }, [dateRangeSelection, t]);

  return {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
  };
}
