import type { Currency } from "@/lib/store";

export function formatCurrency(
  amount: number,
  currency: Currency = "ILS"
): string {
  const formats: Record<Currency, { locale: string; currency: string }> = {
    ILS: { locale: "he-IL", currency: "ILS" },
    USD: { locale: "en-US", currency: "USD" },
    EUR: { locale: "de-DE", currency: "EUR" },
  };

  const format = formats[currency];

  // Round the amount to one decimal place
  const roundedAmount = Math.round(amount * 10) / 10;

  return new Intl.NumberFormat(format.locale, {
    style: "currency",
    currency: format.currency,
    minimumFractionDigits: 1, // Ensure one digit after decimal point
    maximumFractionDigits: 1, // Ensure one digit after decimal point
  }).format(roundedAmount);
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;

  const rates: Record<Currency, Record<Currency, number>> = {
    ILS: { USD: 0.27, EUR: 0.25, ILS: 1 },
    USD: { ILS: 3.7, EUR: 0.93, USD: 1 },
    EUR: { ILS: 4, USD: 1.07, EUR: 1 },
  };

  return amount * rates[from][to];
}
