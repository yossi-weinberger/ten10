import { CURRENCIES } from "../currencies";
import type { CurrencyCode } from "../currencies";

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

  const isInteger = amount % 1 === 0;

  const options: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currencyCode,
  };

  if (isInteger) {
    // For whole numbers, display no decimal places.
    options.minimumFractionDigits = 0;
    options.maximumFractionDigits = 0;
  } else {
    // For numbers with decimals, round to exactly one decimal place.
    options.minimumFractionDigits = 1;
    options.maximumFractionDigits = 1;
  }

  return new Intl.NumberFormat(locale, options).format(amount);
}

