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

/** Decimals the app shows for an amount: none for a whole number, otherwise one. */
export function currencyFractionDigits(amount: number): 0 | 1 {
  return amount % 1 === 0 ? 0 : 1;
}

export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = "ILS",
  lang: string = "he"
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

  const digits = currencyFractionDigits(amount);
  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  };

  return new Intl.NumberFormat(locale, options).format(amount);
}

