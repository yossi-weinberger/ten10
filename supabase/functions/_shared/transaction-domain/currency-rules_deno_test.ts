import { applyConversion, roundExchangeRate } from "./currency-rules.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

const AMOUNT_CASES: Array<[number, number, number]> = [
  [100, 3.7123, 371.23],
  [19.99, 3.6525, 73.01],
  [10.25, 3.333, 34.16],
  [33.33, 3, 99.99],
  [0.1, 0.2, 0.02],
  [1.005, 1, 1],
  [1.015, 1, 1.01],
  [1.045, 1, 1.04],
  [2.675, 1, 2.67],
  [1, 0.005, 0.01],
  [1, 0.015, 0.01],
  [123.45, 3.71, 458],
  [1, 0.004, 0],
];

Deno.test("applyConversion matches the form toFixed amount", () => {
  for (const [originalAmount, rate, expected] of AMOUNT_CASES) {
    const result = applyConversion({
      originalAmount,
      originalCurrency: "USD",
      defaultCurrency: "ILS",
      rate,
      conversionDate: "2026-10-18",
      rateSource: "auto",
    });
    assertEquals(result.amount, expected);
    assertEquals(result.currency, "ILS");
    assertEquals(result.original_amount, originalAmount);
    assertEquals(result.original_currency, "USD");
    assertEquals(result.conversion_rate, roundExchangeRate(rate));
    assertEquals(result.conversion_date, "2026-10-18");
    assertEquals(result.rate_source, "auto");
  }
});

Deno.test("applyConversion rounds the rate to 4 decimals before multiplying", () => {
  const result = applyConversion({
    originalAmount: 100,
    originalCurrency: "USD",
    defaultCurrency: "ILS",
    rate: 3.71235,
    rateSource: "manual",
  });
  assertEquals(result.conversion_rate, 3.7124);
  assertEquals(result.amount, Number((100 * 3.7124).toFixed(2)));
});

Deno.test("applyConversion clears conversion fields for the default currency", () => {
  const result = applyConversion({
    originalAmount: 42.5,
    originalCurrency: "ILS",
    defaultCurrency: "ILS",
    rate: 3.7,
    conversionDate: "2026-10-18",
    rateSource: "manual",
  });
  assertEquals(result, {
    amount: 42.5,
    currency: "ILS",
    original_amount: null,
    original_currency: null,
    conversion_rate: null,
    conversion_date: null,
    rate_source: null,
  });
});
