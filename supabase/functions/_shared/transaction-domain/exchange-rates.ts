/**
 * Exchange-rate providers and response parsing.
 * The caller injects fetch. Cache, offline, last-known, and the
 * same-currency shortcut stay in each runtime.
 */

export interface ExchangeRateHttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  json(): Promise<unknown>;
}

export type ExchangeRateFetch = (url: string) => Promise<ExchangeRateHttpResponse>;

export interface ExchangeRateProvider {
  name: "exchangerate-api" | "frankfurter" | "floatrates";
  buildUrl: (from: string, to: string) => string;
  parseRate: (data: unknown, from: string, to: string) => number | null;
}

export const EXCHANGE_RATE_PROVIDERS: readonly ExchangeRateProvider[] = [
  {
    name: "exchangerate-api",
    buildUrl: (from) => `https://api.exchangerate-api.com/v4/latest/${from}`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as { rates?: Record<string, number> };
      return d.rates?.[to] ?? null;
    },
  },
  {
    name: "frankfurter",
    buildUrl: (from, to) => `https://api.frankfurter.app/latest?from=${from}&symbols=${to}`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as { rates?: Record<string, number> };
      return d.rates?.[to] ?? null;
    },
  },
  {
    name: "floatrates",
    buildUrl: (from) => `https://www.floatrates.com/daily/${from.toLowerCase()}.json`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as Record<string, { rate?: number }>;
      const key = to.toLowerCase();
      return d[key]?.rate ?? null;
    },
  },
];

export interface ProviderRate {
  provider: ExchangeRateProvider["name"];
  /** Unrounded rate from the provider body. */
  rate: number;
}

/**
 * Try each provider in order. A non-OK response, a thrown fetch, or a missing
 * or zero rate falls through to the next provider. Returns null when all fail.
 */
export async function fetchExchangeRateFromProviders(
  from: string,
  to: string,
  fetchImpl: ExchangeRateFetch,
): Promise<ProviderRate | null> {
  for (const provider of EXCHANGE_RATE_PROVIDERS) {
    try {
      const response = await fetchImpl(provider.buildUrl(from, to));
      if (!response.ok) continue;

      const data = await response.json();
      const rate = provider.parseRate(data, from, to);
      if (!rate) continue;

      return { provider: provider.name, rate };
    } catch {
      // Try the next provider.
    }
  }

  return null;
}
