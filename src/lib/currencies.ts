export const CURRENCIES = [
  { code: "ILS", symbol: "₪", name: "currencyNameILS" },
  { code: "USD", symbol: "$", name: "currencyNameUSD" },
  { code: "EUR", symbol: "€", name: "currencyNameEUR" },
  { code: "CAD", symbol: "C$", name: "currencyNameCAD" },
  { code: "GBP", symbol: "£", name: "currencyNameGBP" },
  { code: "AUD", symbol: "A$", name: "currencyNameAUD" },
  { code: "CHF", symbol: "₣", name: "currencyNameCHF" },
  { code: "ARS", symbol: "$", name: "currencyNameARS" },
  { code: "BRL", symbol: "R$", name: "currencyNameBRL" },
  { code: "ZAR", symbol: "R", name: "currencyNameZAR" },
  { code: "MXN", symbol: "$", name: "currencyNameMXN" },
  { code: "UAH", symbol: "₴", name: "currencyNameUAH" },
] as const;

export type CurrencyObject = (typeof CURRENCIES)[number];
export type CurrencyCode = CurrencyObject["code"];

const CURRENCY_CODE_SET = new Set<string>(CURRENCIES.map((c) => c.code));

/** Safe for UI/formatting when settings or DB may hold an unknown code. */
export function normalizeCurrencyCode(
  code: string | undefined | null
): CurrencyCode {
  if (code && CURRENCY_CODE_SET.has(code)) {
    return code as CurrencyCode;
  }
  return "ILS";
}
