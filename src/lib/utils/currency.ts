import { CURRENCIES } from "../currencies";
import type { CurrencyCode } from "../currencies";

/**
 * Same gate the static conversion indicator uses: a stored original amount in
 * a different currency, whose value is not identical to the converted amount.
 */
export function hasStoredCurrencyConversion(input: {
  amount: number;
  currency: string;
  originalAmount?: number | null;
  originalCurrency?: string | null;
}): boolean {
  const { amount, currency, originalAmount, originalCurrency } = input;
  return !(
    originalAmount == null ||
    originalAmount === amount ||
    originalCurrency === currency
  );
}

/** Decimals the app shows for an amount: none for a whole number, otherwise two. */
export function currencyFractionDigits(amount: number): 0 | 2 {
  return amount % 1 === 0 ? 0 : 2;
}

export type FormatCurrencyOptions = {
  /**
   * Digits for a non-whole amount. Display uses 2.
   * PDF export passes 1 so existing document text stays unchanged.
   */
  fractionalDigits?: 1 | 2;
};

export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = "ILS",
  lang: string = "he",
  options?: FormatCurrencyOptions,
): string {
  // Map currency codes to their appropriate locales for correct formatting.
  const localeMap: Record<string, Record<CurrencyCode, string>> = {
    he: {
      ILS: "he-IL",
      USD: "he-IL",
      EUR: "he-IL",
    },
    en: {
      ILS: "en-IL",
      USD: "en-US",
      EUR: "en-GB",
    },
  };

  const locale = localeMap[lang]?.[currencyCode] || "he-IL"; // Fallback to Hebrew locale

  let digits: 0 | 1 | 2;
  if (options?.fractionalDigits === 1) {
    digits = amount % 1 === 0 ? 0 : 1;
  } else {
    digits = currencyFractionDigits(amount);
  }
  const formatOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  };

  return new Intl.NumberFormat(locale, formatOptions).format(amount);
}

