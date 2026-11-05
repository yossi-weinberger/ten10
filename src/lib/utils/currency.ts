import { CURRENCIES } from "../currencies";
import type { CurrencyCode } from "../currencies";

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

