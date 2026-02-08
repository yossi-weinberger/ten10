/**
 * Payment Methods Service
 *
 * Provides functionality to fetch distinct payment methods that users have used.
 * Results are cached to avoid repeated database queries.
 */

import { supabase } from "@/lib/supabaseClient";
import { getPlatform } from "../platformManager";
import { logger } from "@/lib/logger";

const paymentMethodCache: Map<string, string[]> = new Map();
let cacheVersion = 0;

async function fetchUserPaymentMethodsWeb(): Promise<string[]> {
  logger.log("PaymentMethodsService (Web): Fetching payment methods");
  try {
    const { data, error } = await supabase.rpc("get_user_payment_methods");

    if (error) {
      logger.error("Error fetching payment methods from Supabase RPC:", error);
      return [];
    }

    const methods = (data || []).map(
      (row: { payment_method: string }) => row.payment_method
    );
    logger.log(
      `PaymentMethodsService (Web): Found ${methods.length} methods`
    );
    return methods;
  } catch (error) {
    logger.error("Error in fetchUserPaymentMethodsWeb:", error);
    return [];
  }
}

async function fetchUserPaymentMethodsDesktop(): Promise<string[]> {
  logger.log("PaymentMethodsService (Desktop): Fetching payment methods");
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const methods = await invoke<string[]>("get_distinct_payment_methods");
    logger.log(
      `PaymentMethodsService (Desktop): Found ${methods.length} methods`
    );
    return methods;
  } catch (error) {
    logger.error("Error invoking get_distinct_payment_methods:", error);
    return [];
  }
}

export async function getUserPaymentMethods(): Promise<string[]> {
  const platform = getPlatform();
  const cacheKey = `${platform}`;

  if (paymentMethodCache.has(cacheKey)) {
    logger.log(
      `PaymentMethodsService: Returning cached methods for '${cacheKey}'`
    );
    return paymentMethodCache.get(cacheKey)!;
  }

  let methods: string[];
  if (platform === "desktop") {
    methods = await fetchUserPaymentMethodsDesktop();
  } else if (platform === "web") {
    methods = await fetchUserPaymentMethodsWeb();
  } else {
    logger.warn("PaymentMethodsService: Platform not yet determined");
    return [];
  }

  paymentMethodCache.set(cacheKey, methods);
  return methods;
}

export function getPaymentMethodCacheVersion(): number {
  return cacheVersion;
}

export function clearPaymentMethodCache(): void {
  logger.log("PaymentMethodsService: Clearing payment method cache");
  paymentMethodCache.clear();
  cacheVersion++;
}
