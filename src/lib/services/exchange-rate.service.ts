import { logger } from "@/lib/logger";
import { getPlatform } from "@/lib/platformManager";
import { CurrencyCode } from "@/lib/currencies";
import { roundExchangeRate } from "../../../supabase/functions/_shared/transaction-domain/currency-rules.ts";
import { fetchExchangeRateFromProviders } from "../../../supabase/functions/_shared/transaction-domain/exchange-rates.ts";
// import { invoke } from "@tauri-apps/api/core"; // STATIC IMPORT REMOVED - using dynamic imports instead

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

    const fetched = await fetchExchangeRateFromProviders(from, to, fetch);
    if (!fetched) {
      logger.error(`ExchangeRateService: All providers failed for ${from} -> ${to}`);
      return this.getLastKnownRate(from, to);
    }

    const { rate, provider } = fetched;
    const roundedRate = roundExchangeRate(rate);

    rateCache[cacheKey] = { rate: roundedRate, timestamp: Date.now() };

    // Also cache the reverse rate from the unrounded forward rate.
    const reverseCacheKey = `${to}-${from}`;
    const reverseRate = roundExchangeRate(1 / rate);
    rateCache[reverseCacheKey] = { rate: reverseRate, timestamp: Date.now() };

    logger.log(
      `ExchangeRateService: Got rate from "${provider}" for ${from} -> ${to}: ${roundedRate}`,
    );
    return roundedRate;
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
        // Dynamic import to avoid bundling Tauri in web builds
        const { invoke } = await import("@tauri-apps/api/core");
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
