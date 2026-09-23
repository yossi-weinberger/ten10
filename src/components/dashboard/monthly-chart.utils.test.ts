import { describe, expect, it } from "vitest";
import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";
import { formatGregorianMonthlyChartData } from "./monthly-chart.utils";

const data: MonthlyDataPoint[] = [
  {
    month_label: "2026-12",
    income: 1200,
    donations: 120,
    expenses: 300,
  },
  {
    month_label: "2026-01",
    income: 1000,
    donations: 100,
    expenses: 200,
  },
];

describe("formatGregorianMonthlyChartData", () => {
  it("sorts stable Gregorian month keys and formats English labels", () => {
    expect(formatGregorianMonthlyChartData(data, "en")).toEqual([
      {
        month: "Jan 2026",
        income: 1000,
        donations: 100,
        expenses: 200,
      },
      {
        month: "Dec 2026",
        income: 1200,
        donations: 120,
        expenses: 300,
      },
    ]);
  });

  it("sorts stable Gregorian month keys and formats Hebrew labels", () => {
    expect(formatGregorianMonthlyChartData(data, "he")).toEqual([
      {
        month: "ינו׳ 2026",
        income: 1000,
        donations: 100,
        expenses: 200,
      },
      {
        month: "דצמ׳ 2026",
        income: 1200,
        donations: 120,
        expenses: 300,
      },
    ]);
  });

  it("does not mutate the server response order", () => {
    formatGregorianMonthlyChartData(data, "en");

    expect(data.map((item) => item.month_label)).toEqual([
      "2026-12",
      "2026-01",
    ]);
  });
});
