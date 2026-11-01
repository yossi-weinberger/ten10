import { describe, expect, it } from "vitest";
import { yearSumFromReader } from "./reader-question";

describe("yearSumFromReader", () => {
  it("uses the dates the reader returned", () => {
    const sum = yearSumFromReader({
      measure: "sum",
      family: "donation",
      recipient: "כולל",
      category: null,
      paymentMethod: null,
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(sum).toMatchObject({
      type: "donation",
      year: 2026,
      month: null,
      months: 12,
      recipient: "כולל",
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("asks for a family when the reader left it empty", () => {
    expect(yearSumFromReader({
      measure: "sum",
      family: null,
      recipient: null,
      category: null,
      paymentMethod: null,
      from: "2026-01-01",
      to: "2026-12-31",
    })).toBe("ask_family");
  });
});
