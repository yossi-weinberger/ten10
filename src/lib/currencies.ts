export const CURRENCIES = [
  { code: "ILS", symbol: "₪", name: "שקל ישראלי" },
  { code: "USD", symbol: "$", name: "דולר אמריקאי" },
  { code: "EUR", symbol: "€", name: "אירו" },
] as const;

export type CurrencyObject = (typeof CURRENCIES)[number];
export type CurrencyCode = CurrencyObject["code"];
