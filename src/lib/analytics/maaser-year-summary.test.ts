import { describe, expect, it } from "vitest";
import { getMaaserYearRange } from "../../../supabase/functions/_shared/calendar/maaser-year.ts";
import {
  accumulateTitheActivity,
  accumulateTitheBalance,
  buildMaaserYearSummary,
  type TitheTransaction,
} from "./maaser-year-summary";

const seed: TitheTransaction[] = [
  { date: "2026-08-01", type: "income", amount: 1000, is_chomesh: false },
  { date: "2026-08-15", type: "donation", amount: 40, is_chomesh: false },
  { date: "2026-09-11", type: "income", amount: 200, is_chomesh: true },
  { date: "2026-09-12", type: "income", amount: 3000, is_chomesh: false },
  { date: "2026-09-20", type: "donation", amount: 150, is_chomesh: false },
  { date: "2026-10-01", type: "recognized-expense", amount: 100, is_chomesh: false },
  { date: "2027-10-01", type: "donation", amount: 50, is_chomesh: false },
  { date: "2027-10-02", type: "income", amount: 800, is_chomesh: false },
];

describe("maaser year summary", () => {
  it("matches a manual seed from 1 Tishrei through 29 Elul", () => {
    const range = getMaaserYearRange(5787);
    const opening = accumulateTitheBalance(seed, range.openingAsOfDate);
    const closing = accumulateTitheBalance(seed, range.endDate);
    const activity = accumulateTitheActivity(seed, range.startDate, range.endDate);

    expect(opening).toEqual({
      maaser_balance: 80,
      chomesh_balance: 20,
      total_balance: 100,
    });
    expect(activity).toEqual({
      maaser_balance: 90,
      chomesh_balance: 0,
      total_balance: 90,
    });
    expect(closing.total_balance).toBe(opening.total_balance + activity.total_balance);
    expect(closing).toEqual({
      maaser_balance: 170,
      chomesh_balance: 20,
      total_balance: 190,
    });

    const summary = buildMaaserYearSummary({
      range,
      reportEndDate: range.endDate,
      today: "2027-10-01",
      opening,
      closing,
      incomeInRange: 3000,
      donationsInRange: 200,
    });

    expect(summary.isCurrentYear).toBe(true);
    expect(summary.yearDelta.total_balance).toBe(90);
    expect(summary.estimatedMaaserFromIncome).toBe(300);
  });

  it("ignores the next Hebrew year and exempt or personal donations", () => {
    const range = getMaaserYearRange(5787);
    const nextYearStart = accumulateTitheBalance(seed, "2027-10-02");
    const yearEnd = accumulateTitheBalance(seed, range.endDate);

    expect(nextYearStart.total_balance - yearEnd.total_balance).toBe(80);
    expect(
      accumulateTitheActivity(
        [
          ...seed,
          { date: "2026-12-01", type: "exempt-income", amount: 500 },
          { date: "2026-12-02", type: "non_tithe_donation", amount: 90 },
        ],
        range.startDate,
        range.endDate,
      ).total_balance,
    ).toBe(90);
  });
});
