import { describe, expect, it } from "vitest";
import {
  MIN_TRANSACTION_DATE,
  isOnOrAfterMinTransactionDate,
} from "./transaction-date";

describe("isOnOrAfterMinTransactionDate", () => {
  it("accepts the minimum allowed canonical date", () => {
    expect(isOnOrAfterMinTransactionDate(MIN_TRANSACTION_DATE)).toBe(true);
  });

  it("rejects a three-digit year that would pass a raw string compare", () => {
    expect(isOnOrAfterMinTransactionDate("999-01-01")).toBe(false);
  });

  it("rejects a padded year-999 date", () => {
    expect(isOnOrAfterMinTransactionDate("0999-01-01")).toBe(false);
  });
});
