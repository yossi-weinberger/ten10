import { describe, expect, it } from "vitest";
import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";
import {
  formatMonthlyChartData,
  getPreviousChartAnchor,
  shouldLoadInitialChart,
} from "./monthly-chart.utils";

const data: MonthlyDataPoint[] = [
  {
    period_index: 2,
    period_start: "2026-12-01",
    period_end: "2027-01-01",
    period_key: "2026-12",
    cache_key: "gregorian:2026-12",
    income: 1200,
    donations: 120,
    expenses: 300,
  },
  {
    period_index: 1,
    period_start: "2026-01-01",
    period_end: "2026-02-01",
    period_key: "2026-01",
    cache_key: "gregorian:2026-01",
    income: 1000,
    donations: 100,
    expenses: 200,
  },
];

describe("formatGregorianMonthlyChartData", () => {
  it("sorts stable Gregorian month keys and formats English labels", () => {
    expect(
      formatMonthlyChartData(data, "gregorian", "en"),
    ).toEqual([
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
    expect(
      formatMonthlyChartData(data, "gregorian", "he"),
    ).toEqual([
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
    formatMonthlyChartData(data, "gregorian", "en");

    expect(data.map((item) => item.period_key)).toEqual([
      "2026-12",
      "2026-01",
    ]);
  });

  it("renders Hebrew labels from calendar-neutral period starts", () => {
    const hebrewData: MonthlyDataPoint[] = [
      {
        period_index: 2,
        period_start: "2027-03-10",
        period_end: "2027-04-08",
        period_key: "5787-07",
        cache_key: "hebrew:5787-07",
        income: 200,
        donations: 20,
        expenses: 40,
      },
      {
        period_index: 1,
        period_start: "2027-02-08",
        period_end: "2027-03-10",
        period_key: "5787-06",
        cache_key: "hebrew:5787-06",
        income: 100,
        donations: 10,
        expenses: 20,
      },
    ];

    expect(formatMonthlyChartData(hebrewData, "hebrew", "en")).toEqual([
      {
        month: "Adar I תשפ״ז",
        income: 100,
        donations: 10,
        expenses: 20,
      },
      {
        month: "Adar II תשפ״ז",
        income: 200,
        donations: 20,
        expenses: 40,
      },
    ]);
  });

  it("moves load-more to the previous primary-calendar month", () => {
    expect(
      getPreviousChartAnchor("2027-03-10", "hebrew"),
    ).toBe("2027-02-08");
    expect(
      getPreviousChartAnchor("2026-03-01", "gregorian"),
    ).toBe("2026-02-01");
  });

  it("reloads after a calendar change clears the chart cache", () => {
    expect(
      shouldLoadInitialChart({
        platformReady: true,
        platform: "web",
        userId: "user-1",
        isLoading: false,
        hasError: false,
        initialLoadAttempted: true,
        dataLength: 0,
      }),
    ).toBe(true);
  });
});
