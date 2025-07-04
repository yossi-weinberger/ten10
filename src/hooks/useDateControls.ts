import { useMemo, useState } from "react";

export type DateRangeSelectionType = "month" | "year" | "all";

export interface DateRangeObject {
  startDate: string;
  endDate: string;
  label?: string;
}

export const dateRangeLabels: Record<DateRangeSelectionType, string> = {
  month: "מתחילת החודש",
  year: "מתחילת השנה",
  all: "מאז ומתמיד",
};

export function useDateControls() {
  const [dateRangeSelection, setDateRangeSelection] =
    useState<DateRangeSelectionType>("month");

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
        label = dateRangeLabels.month;
        break;
      case "year":
        startDateStr = new Date(today.getFullYear(), 0, 1)
          .toISOString()
          .split("T")[0];
        endDateStr = new Date(today.getFullYear(), 11, 31)
          .toISOString()
          .split("T")[0];
        label = dateRangeLabels.year;
        break;
      case "all":
        startDateStr = "1970-01-01";
        endDateStr = new Date().toISOString().split("T")[0];
        label = dateRangeLabels.all;
        break;
      default:
        startDateStr = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDateStr = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
        label = dateRangeLabels.month;
    }
    return { startDate: startDateStr, endDate: endDateStr, label };
  }, [dateRangeSelection]);

  return {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
  };
}
