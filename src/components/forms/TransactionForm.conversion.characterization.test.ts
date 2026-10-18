import { describe, expect, it } from "vitest";
import { applyConversion } from "../../../supabase/functions/_shared/transaction-domain/currency-rules.ts";

function transactionFormConvertedAmount(originalAmount: number, conversionRate: number): number {
  return applyConversion({
    originalAmount,
    originalCurrency: "USD",
    defaultCurrency: "ILS",
    rate: conversionRate,
  }).amount;
}

describe("TransactionForm conversion formula (characterization)", () => {
  it.each([
    [100, 3.7123, 371.23],
    [19.99, 3.6525, 73.01],
    [10.25, 3.333, 34.16],
    [33.33, 3, 99.99],
    [0.1, 0.2, 0.02],
  ])("%s x %s = %s", (amount, rate, expected) => {
    expect(transactionFormConvertedAmount(amount, rate)).toBe(expected);
  });

  describe("x.xx5 products follow binary floating point, not half-up", () => {
    it.each([
      [1.005, 1, 1],
      [1.015, 1, 1.01],
      [1.045, 1, 1.04],
      [2.675, 1, 2.67],
      [1, 0.005, 0.01],
      [1, 0.015, 0.01],
      [123.45, 3.71, 458],
    ])("%s x %s = %s", (amount, rate, expected) => {
      expect(transactionFormConvertedAmount(amount, rate)).toBe(expected);
    });
  });

  it("can round a tiny product to 0", () => {
    expect(transactionFormConvertedAmount(1, 0.004)).toBe(0);
  });
});
