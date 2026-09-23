import { describe, expect, it } from "vitest";
import { getIsraelDate } from "./israel-date.ts";

describe("getIsraelDate", () => {
  it("uses the next Israeli day during daylight saving time", () => {
    expect(getIsraelDate(new Date("2026-06-30T21:30:00.000Z"))).toBe(
      "2026-07-01",
    );
  });

  it("uses the next Israeli day during standard time", () => {
    expect(getIsraelDate(new Date("2026-12-31T22:30:00.000Z"))).toBe(
      "2027-01-01",
    );
  });

  it("does not advance before midnight in Israel", () => {
    expect(getIsraelDate(new Date("2026-06-30T20:30:00.000Z"))).toBe(
      "2026-06-30",
    );
  });
});
