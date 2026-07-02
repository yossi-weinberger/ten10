import { describe, it, expect } from "vitest";
import { getPreviousPeriodRange } from "./date-range";

describe("getPreviousPeriodRange", () => {
  it("returns the immediately preceding period of equal length", () => {
    const prev = getPreviousPeriodRange("2024-02-01", "2024-02-29");
    expect(prev.endDate).toBe("2024-01-31");
    expect(prev.startDate).toBe("2024-01-03"); // same 28-day span
  });

  it("crosses a year boundary", () => {
    const prev = getPreviousPeriodRange("2024-01-01", "2024-01-31");
    expect(prev.endDate).toBe("2023-12-31");
    expect(prev.startDate).toBe("2023-12-01");
  });

  it("handles a single-day range", () => {
    const prev = getPreviousPeriodRange("2024-06-15", "2024-06-15");
    expect(prev.endDate).toBe("2024-06-14");
    expect(prev.startDate).toBe("2024-06-14");
  });
});
