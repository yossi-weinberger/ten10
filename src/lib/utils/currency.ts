import { CURRENCIES } from "../currencies";
import type { CurrencyCode } from "../currencies";

export function formatCurrency(
  amount: number,
  currencyCode: CurrencyCode = "ILS"
): string {
  // Map currency codes to their appropriate locales for correct formatting.
  const localeMap: Record<CurrencyCode, string> = {
    ILS: "he-IL",
    USD: "en-US",
    EUR: "de-DE", // Using German locale for Euro symbol convention
  };

  const locale = localeMap[currencyCode] || "he-IL"; // Fallback to Hebrew locale

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

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode
): number {
  if (from === to) return amount;

  // This is a simplified conversion rate map.
  // In a real-world application, this would come from an API.
  const rates: Record<CurrencyCode, Record<CurrencyCode, number>> = {
    ILS: { USD: 0.27, EUR: 0.25, ILS: 1 },
    USD: { ILS: 3.7, EUR: 0.93, USD: 1 },
    EUR: { ILS: 4, USD: 1.07, EUR: 1 },
  };

  return amount * rates[from][to];
}
