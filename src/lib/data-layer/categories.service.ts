/**
 * Categories Service
 *
 * Provides functionality to fetch distinct categories that users have used
 * for different transaction types. Categories are cached to avoid repeated
 * database queries.
 */

import { supabase } from "@/lib/supabaseClient";
import { getPlatform } from "../platformManager";
import { logger } from "@/lib/logger";
import { TransactionType } from "@/types/transaction";

// Cache for user categories - keyed by transaction type
const categoryCache: Map<string, string[]> = new Map();

// Version counter - increments when cache is invalidated
// Components can use this to know when to re-fetch
let cacheVersion = 0;

/**
 * Fetch distinct categories from Supabase for the current user
 */
async function fetchUserCategoriesWeb(
  transactionType: TransactionType
): Promise<string[]> {
  logger.log(
    `CategoriesService (Web): Fetching categories for type '${transactionType}'`
  );
  try {
    const { data, error } = await supabase.rpc("get_user_categories", {
      p_type: transactionType,
    });

    if (error) {
      logger.error("Error fetching categories from Supabase RPC:", error);
      return [];
    }

    // The RPC returns an array of objects with a 'category' field
    const categories = (data || []).map(
      (row: { category: string }) => row.category
    );
    logger.log(
      `CategoriesService (Web): Found ${categories.length} categories`
    );
    return categories;
  } catch (error) {
    logger.error("Error in fetchUserCategoriesWeb:", error);
    return [];
  }
}

/**
 * Fetch distinct categories from SQLite for desktop users
 */
async function fetchUserCategoriesDesktop(
  transactionType: TransactionType
): Promise<string[]> {
  logger.log(
    `CategoriesService (Desktop): Fetching categories for type '${transactionType}'`
  );
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const categories = await invoke<string[]>("get_distinct_categories", {
      transactionType,
    });
    logger.log(
      `CategoriesService (Desktop): Found ${categories.length} categories`
    );
    return categories;
  } catch (error) {
    logger.error("Error invoking get_distinct_categories:", error);
    return [];
  }
}

/**
 * Get user categories for a specific transaction type.
 * Results are cached to avoid repeated database queries.
 *
 * @param transactionType - The type of transaction (income, expense, donation)
 * @returns Array of category strings the user has used
 */
export async function getUserCategories(
  transactionType: TransactionType
): Promise<string[]> {
  const platform = getPlatform();

  // Check cache first
  const cacheKey = `${platform}-${transactionType}`;
  if (categoryCache.has(cacheKey)) {
    logger.log(
      `CategoriesService: Returning cached categories for '${cacheKey}'`
    );
    return categoryCache.get(cacheKey)!;
  }

  // Fetch from appropriate backend
  let categories: string[];
  if (platform === "desktop") {
    categories = await fetchUserCategoriesDesktop(transactionType);
  } else if (platform === "web") {
    categories = await fetchUserCategoriesWeb(transactionType);
  } else {
    // Platform is 'loading', return empty array
    logger.warn("CategoriesService: Platform not yet determined");
    return [];
  }

  // Cache the result
  categoryCache.set(cacheKey, categories);
  return categories;
}

/**
 * Get the current cache version.
 * Components can use this to detect when cache was invalidated.
 */
export function getCategoryCacheVersion(): number {
  return cacheVersion;
}

/**
 * Clear the category cache. Should be called when a transaction
 * with a new category is added.
 */
export function clearCategoryCache(): void {
  logger.log("CategoriesService: Clearing category cache");
  categoryCache.clear();
  cacheVersion++;
}

/**
 * Clear cache for a specific transaction type.
 * Useful when you know only one type's categories changed.
 *
 * @param transactionType - The type to clear cache for
 */
export function clearCategoryCacheForType(
  transactionType: TransactionType
): void {
  const platform = getPlatform();
  const cacheKey = `${platform}-${transactionType}`;
  logger.log(`CategoriesService: Clearing cache for '${cacheKey}'`);
  categoryCache.delete(cacheKey);
  cacheVersion++;
}
