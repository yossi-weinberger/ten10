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
    }, "2027-01-15", "gregorian");
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
    }, "2026-11-03", "gregorian")).toBe("ask_family");
  });

  it("divides an average by the months that passed", () => {
    const asked = { measure: "average" as const, family: "expense" as const, recipient: null, category: null, paymentMethod: null };
    const today = "2026-11-03";
    expect(yearSumFromReader({ ...asked, from: "2026-08-04", to: today }, today, "gregorian")).toMatchObject({ months: 3 });
    expect(yearSumFromReader({ ...asked, from: "2026-01-01", to: "2026-12-31" }, today, "gregorian")).toMatchObject({ months: 10 });
  });
});
