import { logger } from "@/lib/logger";
import { getPlatform } from "@/lib/platformManager";
import { CurrencyCode } from "@/lib/currencies";
import { invoke } from "@tauri-apps/api/core";

const API_URL = "https://api.exchangerate-api.com/v4/latest/";

interface ExchangeRateResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

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

    try {
      const response = await fetch(`${API_URL}${from}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch rates: ${response.statusText}`);
      }

      const data: ExchangeRateResponse = await response.json();
      const rate = data.rates[to];

      if (!rate) {
        throw new Error(`Rate not found for ${to} in response for ${from}`);
      }

      // Update cache
      rateCache[cacheKey] = { rate, timestamp: Date.now() };
      
      // Also cache the reverse rate if possible (approximation)
      const reverseCacheKey = `${to}-${from}`;
      rateCache[reverseCacheKey] = { rate: 1 / rate, timestamp: Date.now() };

      logger.log(`ExchangeRateService: Fetched rate for ${from} -> ${to}: ${rate}`);
      return rate;
    } catch (error) {
      logger.error("ExchangeRateService: Error fetching exchange rate:", error);
      return this.getLastKnownRate(from, to);
    }
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
