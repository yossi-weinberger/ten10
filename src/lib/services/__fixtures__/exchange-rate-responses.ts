// Saved provider responses for USD -> ILS, shared by the web service tests and
// future Edge parity tests. Pure data, no `@/` imports.

export interface ExchangeRateProviderFixture {
  provider: "exchangerate-api" | "frankfurter" | "floatrates";
  url: string;
  body: unknown;
  /** Rate after Math.round(rate * 10000) / 10000. */
  expectedRate: number;
}

export const USD_ILS_PROVIDER_FIXTURES: ExchangeRateProviderFixture[] = [
  {
    provider: "exchangerate-api",
    url: "https://api.exchangerate-api.com/v4/latest/USD",
    body: {
      provider: "https://www.exchangerate-api.com",
      base: "USD",
      date: "2026-10-16",
      time_last_updated: 1792108801,
      rates: { USD: 1, EUR: 0.9214, ILS: 3.71235 },
    },
    expectedRate: 3.7124,
  },
  {
    provider: "frankfurter",
    url: "https://api.frankfurter.app/latest?from=USD&symbols=ILS",
    body: { amount: 1.0, base: "USD", date: "2026-10-16", rates: { ILS: 3.71234 } },
    expectedRate: 3.7123,
  },
  {
    provider: "floatrates",
    url: "https://www.floatrates.com/daily/usd.json",
    body: {
      eur: { code: "EUR", alphaCode: "EUR", numericCode: "978", name: "Euro", rate: 0.92151, date: "Fri, 16 Oct 2026 11:55:01 GMT", inverseRate: 1.08517 },
      ils: { code: "ILS", alphaCode: "ILS", numericCode: "376", name: "Israeli New Sheqel", rate: 3.7140221, date: "Fri, 16 Oct 2026 11:55:01 GMT", inverseRate: 0.269249 },
    },
    expectedRate: 3.714,
  },
];

/** Same-provider bodies that parse to "no rate" for USD -> ILS. */
export const USD_ILS_MISSING_RATE_BODIES: Record<ExchangeRateProviderFixture["provider"], unknown> = {
  "exchangerate-api": { base: "USD", rates: { EUR: 0.9214 } },
  frankfurter: { amount: 1.0, base: "USD", rates: {} },
  floatrates: { eur: { code: "EUR", rate: 0.92151 } },
};
