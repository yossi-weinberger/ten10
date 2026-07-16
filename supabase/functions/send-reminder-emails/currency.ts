/** Supported reminder currencies (matches app `src/lib/currencies.ts`). */
const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: "₪",
  USD: "$",
  EUR: "€",
  CAD: "C$",
  GBP: "£",
  AUD: "A$",
  CHF: "CHF",
  ARS: "$",
  BRL: "R$",
  ZAR: "R",
  MXN: "$",
  UAH: "₴",
};

const CURRENCY_CODE_SET = new Set(Object.keys(CURRENCY_SYMBOLS));

export type ReminderCurrencyCode = keyof typeof CURRENCY_SYMBOLS;

export function normalizeReminderCurrencyCode(
  value: unknown,
): ReminderCurrencyCode {
  if (typeof value !== "string") return "ILS";
  const normalized = value.trim().toUpperCase();
  if (CURRENCY_CODE_SET.has(normalized)) {
    return normalized as ReminderCurrencyCode;
  }
  return "ILS";
}

/**
 * Format an absolute amount with the user's currency.
 * Keeps the historical ILS layout: `384.70 ₪` (he) / `₪384.70` (en).
 */
export function formatReminderAmount(
  amount: number,
  language: "he" | "en",
  currencyCode: unknown = "ILS",
): string {
  const code = normalizeReminderCurrencyCode(currencyCode);
  const formatted = new Intl.NumberFormat(
    language === "he" ? "he-IL" : "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(Math.abs(amount));

  const symbol = CURRENCY_SYMBOLS[code];

  if (language === "he") {
    return `${formatted} ${symbol}`;
  }

  // Latin currencies that conventionally prefix the symbol.
  if (code === "ILS" || code === "USD" || code === "EUR" || code === "GBP") {
    return `${symbol}${formatted}`;
  }

  return `${symbol}${formatted}`;
}
