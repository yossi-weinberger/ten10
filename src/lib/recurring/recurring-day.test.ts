import { describe, expect, it } from "vitest";
import { clampRecurringDay, maximumRecurringDay } from "./recurring-day";

describe("recurring day limits", () => {
  it("allows 31 only on the Gregorian calendar", () => {
    expect(maximumRecurringDay("gregorian")).toBe(31);
    expect(maximumRecurringDay("hebrew")).toBe(30);
    expect(maximumRecurringDay(undefined)).toBe(31);
  });

  it("clamps a Gregorian day 31 when the calendar becomes Hebrew", () => {
    expect(clampRecurringDay("hebrew", 31)).toBe(30);
    expect(clampRecurringDay("gregorian", 31)).toBe(31);
    expect(clampRecurringDay("hebrew", 12)).toBe(12);
  });
});
