/** Rate sources stored on a converted transaction. */
export const RATE_SOURCES = ["auto", "manual"] as const;
export type RateSource = (typeof RATE_SOURCES)[number];

/**
 * Round an exchange rate to 4 decimal places.
 * Same expression ExchangeRateService uses: Math.round(rate * 10000) / 10000.
 */
export function roundExchangeRate(rate: number): number {
  return Math.round(rate * 10000) / 10000;
}

export interface ApplyConversionInput {
  originalAmount: number;
  originalCurrency: string;
  defaultCurrency: string;
  /** Ignored when the currencies are the same. */
  rate: number;
  conversionDate?: string | null;
  rateSource?: RateSource | null;
}

export interface ApplyConversionResult {
  amount: number;
  currency: string;
  original_amount: number | null;
  original_currency: string | null;
  conversion_rate: number | null;
  conversion_date: string | null;
  rate_source: RateSource | null;
}

/**
 * Convert an amount into the default currency.
 *
 * The stored amount is Number((originalAmount * roundedRate).toFixed(2)).
 * That is the form's expression, not classic half-up, so 1.005 stays 1.
 * The rate is rounded to 4 decimals before the multiply.
 * When the currency is already the default, every conversion field is null.
 */
export function applyConversion(input: ApplyConversionInput): ApplyConversionResult {
  if (input.originalCurrency === input.defaultCurrency) {
    return {
      amount: input.originalAmount,
      currency: input.defaultCurrency,
      original_amount: null,
      original_currency: null,
      conversion_rate: null,
      conversion_date: null,
      rate_source: null,
    };
  }

  const conversionRate = roundExchangeRate(input.rate);
  return {
    amount: Number((input.originalAmount * conversionRate).toFixed(2)),
    currency: input.defaultCurrency,
    original_amount: input.originalAmount,
    original_currency: input.originalCurrency,
    conversion_rate: conversionRate,
    conversion_date: input.conversionDate ?? null,
    rate_source: input.rateSource ?? null,
  };
}
