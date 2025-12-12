export const CURRENCIES = [
  { code: "ILS", symbol: "₪", name: "currencyNameILS" },
  { code: "USD", symbol: "$", name: "currencyNameUSD" },
  { code: "EUR", symbol: "€", name: "currencyNameEUR" },
] as const;

export type CurrencyObject = (typeof CURRENCIES)[number];
export type CurrencyCode = CurrencyObject["code"];
