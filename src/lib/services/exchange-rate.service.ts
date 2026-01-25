import { logger } from "@/lib/logger";
import { getPlatform } from "@/lib/platformManager";
import { CurrencyCode } from "@/lib/currencies";
import { invoke } from "@tauri-apps/api/core";

// Provider configurations - ordered by priority (first = primary, rest = fallbacks)
interface RateProvider {
  name: string;
  buildUrl: (from: CurrencyCode, to: CurrencyCode) => string;
  parseRate: (data: unknown, from: CurrencyCode, to: CurrencyCode) => number | null;
}

const PROVIDERS: RateProvider[] = [
  {
    // 1st Priority: ExchangeRate-API (free tier, CORS-enabled)
    name: "exchangerate-api",
    buildUrl: (from) => `https://api.exchangerate-api.com/v4/latest/${from}`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as { rates?: Record<string, number> };
      return d.rates?.[to] ?? null;
    },
  },
  {
    // 2nd Priority: Frankfurter (free, no API key, ECB rates)
    name: "frankfurter",
    buildUrl: (from, to) => `https://api.frankfurter.app/latest?from=${from}&symbols=${to}`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as { rates?: Record<string, number> };
      return d.rates?.[to] ?? null;
    },
  },
  {
    // 3rd Priority: FloatRates (free, reliable, CORS-enabled, daily updates)
    name: "floatrates",
    buildUrl: (from) => `https://www.floatrates.com/daily/${from.toLowerCase()}.json`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as Record<string, { rate?: number }>;
      const key = to.toLowerCase();
      return d[key]?.rate ?? null;
    },
  },
];

// Simple in-memory cache: { "USD-ILS": { rate: 3.7, timestamp: 123456789 } }
const rateCache: Record<string, { rate: number; timestamp: number }> = {};
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export const ExchangeRateService = {
  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  },

  async fetchExchangeRate(from: CurrencyCode, to: CurrencyCode): Promise<number | null> {
    if (from === to) return 1;

    const cacheKey = `${from}-${to}`;
    const cached = rateCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      logger.log(`ExchangeRateService: Returning cached rate for ${from} -> ${to}: ${cached.rate}`);
      return cached.rate;
    }

    if (!navigator.onLine) {
      logger.warn(`ExchangeRateService: Offline, cannot fetch rate for ${from} -> ${to}`);
      return this.getLastKnownRate(from, to);
    }

    // Try each provider in order until one succeeds
    for (const provider of PROVIDERS) {
      try {
        logger.log(`ExchangeRateService: Trying provider "${provider.name}" for ${from} -> ${to}`);
        
        const url = provider.buildUrl(from, to);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`${provider.name} returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const rate = provider.parseRate(data, from, to);

        if (!rate) {
          throw new Error(`${provider.name}: Rate not found for ${from} -> ${to}`);
        }

        // Round rate to 4 decimal places for storage/display
        const roundedRate = Math.round(rate * 10000) / 10000;

        // Success! Update cache
        rateCache[cacheKey] = { rate: roundedRate, timestamp: Date.now() };
        
        // Also cache the reverse rate (approximation)
        const reverseCacheKey = `${to}-${from}`;
        const reverseRate = Math.round((1 / rate) * 10000) / 10000;
        rateCache[reverseCacheKey] = { rate: reverseRate, timestamp: Date.now() };

        logger.log(`ExchangeRateService: Got rate from "${provider.name}" for ${from} -> ${to}: ${roundedRate}`);
        return roundedRate;
      } catch (error) {
        logger.warn(`ExchangeRateService: Provider "${provider.name}" failed:`, error);
        // Continue to next provider
      }
    }

    // All providers failed
    logger.error(`ExchangeRateService: All providers failed for ${from} -> ${to}`);
    return this.getLastKnownRate(from, to);
  },

  async getLastKnownRate(from: CurrencyCode, to: CurrencyCode): Promise<number | null> {
    const platform = getPlatform();
    
    // Attempt to get from cache first (maybe older than 1 hour but better than nothing)
    const cacheKey = `${from}-${to}`;
    const cached = rateCache[cacheKey];
    if (cached) {
      logger.log(`ExchangeRateService: Returning stale cached rate for ${from} -> ${to}: ${cached.rate}`);
      return cached.rate;
    }

    if (platform === "desktop") {
      try {
        // Invoke Rust command to get last known rate from DB
        const rate = await invoke<number | null>("get_last_known_rate", { fromCurrency: from, toCurrency: to });
        if (rate) {
          logger.log(`ExchangeRateService: Retrieved last known rate from DB for ${from} -> ${to}: ${rate}`);
          return rate;
        }
      } catch (error) {
        logger.error("ExchangeRateService: Error fetching last known rate from DB:", error);
      }
    }

    // For Web, we currently don't have a way to query "last transaction" easily without a new RPC or complex query.
    // We could rely on local store if we had access to it here, but services are usually stateless or independent.
    // For now, return null if not found.
    return null;
  }
};
