import { describe, expect, it } from "vitest";
import { normalizeRow, parseDate } from "./normalize";
import { MIN_TRANSACTION_DATE } from "@/lib/utils/transaction-date";

describe("import date minimum", () => {
  it("parses a valid ISO date", () => {
    expect(parseDate("2024-03-15")).toBe("2024-03-15");
  });

  it("rejects dates before 2000-01-01", () => {
    const result = normalizeRow(
      { date: "1926-01-01", amount: "100" },
      "ILS",
    );

    expect(result.normalized).toBeNull();
    expect(result.issues).toContainEqual({
      code: "date_before_minimum",
      field: "date",
    });
  });

  it("rejects a padded year-999 ISO date", () => {
    const result = normalizeRow(
      { date: "0999-01-01", amount: "100" },
      "ILS",
    );

    expect(result.normalized).toBeNull();
    expect(result.issues).toContainEqual({
      code: "date_before_minimum",
      field: "date",
    });
  });

  it("rejects 01/01/0999 from slash-format import input", () => {
    expect(parseDate("01/01/0999")).toBe("0999-01-01");
    const result = normalizeRow(
      { date: "01/01/0999", amount: "100" },
      "ILS",
    );

    expect(result.normalized).toBeNull();
    expect(result.issues).toContainEqual({
      code: "date_before_minimum",
      field: "date",
    });
  });

  it("accepts the minimum allowed date", () => {
    const result = normalizeRow(
      { date: MIN_TRANSACTION_DATE, amount: "100" },
      "ILS",
    );

    expect(result.normalized?.date).toBe(MIN_TRANSACTION_DATE);
    expect(result.issues.some((issue) => issue.code === "date_before_minimum")).toBe(
      false,
    );
  });
});
