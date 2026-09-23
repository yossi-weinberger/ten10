import { describe, expect, it } from "vitest";
import {
  filterHeatmapDataByCalendarYear,
  formatHeatmapMonthTick,
  getHeatmapCalendarYears,
} from "./transaction-heatmap.utils";

const data = [
  { tx_date: "2026-09-11", total_amount: 10, tx_count: 1 },
  { tx_date: "2026-09-12", total_amount: 20, tx_count: 2 },
  { tx_date: "2026-10-01", total_amount: 30, tx_count: 3 },
];

describe("transaction heatmap calendar labels", () => {
  it("keeps Gregorian year grouping unchanged", () => {
    expect(getHeatmapCalendarYears(data, "gregorian")).toEqual([
      "2026",
    ]);
    expect(
      filterHeatmapDataByCalendarYear(data, "2026", "gregorian"),
    ).toEqual(data);
  });

  it("groups daily Gregorian rows by primary Hebrew year", () => {
    expect(getHeatmapCalendarYears(data, "hebrew")).toEqual([
      "5786",
      "5787",
    ]);
    expect(
      filterHeatmapDataByCalendarYear(data, "5787", "hebrew"),
    ).toEqual(data.slice(1));
  });

  it("formats month ticks in the primary calendar", () => {
    expect(
      formatHeatmapMonthTick("2026-09-01", "gregorian", "en"),
    ).toBe("Sep");
    expect(
      formatHeatmapMonthTick("2026-09-12", "hebrew", "en"),
    ).toBe("Tishri");
    expect(
      formatHeatmapMonthTick("2027-02-08", "hebrew", "he"),
    ).toContain("אדר");
  });
});
