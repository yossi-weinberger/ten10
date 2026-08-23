import { useDonationStore } from "../store";
import { Transaction } from "@/types/transaction";
import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { invoke } from "@tauri-apps/api/core";
import {
  invokeDesktopFilteredTransactions,
  invokeDesktopFilteredTransactionsAllPages,
} from "@/lib/tableTransactions/desktop-filtered-transactions-invoke";
import type { TransactionBulkChange } from "@/lib/tableTransactions/bulkActions";

// --- New CRUD API for Transactions ---

/**
 * Loads all transactions based on the current platform.
 * On desktop, fetches from SQLite via Tauri.
 * On web, fetches from Supabase.
 */
export async function loadTransactions(
  userIdFromAuthContext?: string
): Promise<Transaction[]> {
  const currentPlatform = getPlatform();
  logger.log(
    "TransactionsService: Loading transactions. Platform:",
    currentPlatform
  );
  if (currentPlatform === "desktop") {
    try {
      const transactions = await invokeDesktopFilteredTransactionsAllPages();
      logger.log(
        `TransactionsService: Tauri load successful: ${transactions.length} transactions (full paged load).`
      );
      return transactions;
    } catch (error) {
      logger.error("Error invoking get_filtered_transactions_handler:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      let userIdToQueryWith = userIdFromAuthContext;

      if (!userIdToQueryWith) {
        logger.warn(
          "TransactionsService: UserID not provided from AuthContext. Falling back to supabase.auth.getUser()."
        );
        const {
          data: { user: supabaseUser },
          error: supabaseUserError,
        } = await supabase.auth.getUser();
        if (supabaseUserError) {
          logger.error(
            "TransactionsService (Fallback): Error getting user from Supabase:",
            supabaseUserError
          );
          throw supabaseUserError;
        }
        if (!supabaseUser) {
          logger.error(
            "TransactionsService (Fallback): No user session found."
          );
          throw new Error(
            "No user session for loading transactions (fallback in loadTransactions)."
          );
        }
        userIdToQueryWith = supabaseUser.id;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        logger.error(
          "TransactionsService: Supabase select returned an error:",
          error
        );
        throw error;
      }

      logger.log(
        `TransactionsService: Supabase load successful: ${
          data?.length || 0
        } transactions.`
      );
      return (data as Transaction[]) || [];
    } catch (errorCaught: unknown) {
      logger.error(
        "TransactionsService: Error explicitly caught in loadTransactions (Supabase block):",
        errorCaught
      );
      const errorMessage =
        errorCaught instanceof Error
          ? errorCaught.message
          : JSON.stringify(errorCaught);
      throw new Error(
        `Failed to load transactions from Supabase. Original error: ${errorMessage}`
      );
    }
  } else {
    logger.log(
      "TransactionsService: Platform not yet determined, returning empty transactions."
    );
    return [];
  }
}

/**
 * Fetches the initial balance transaction for the maaser or chomesh pot.
 */
export async function getInitialBalanceForPot(
  isChomesh: boolean
): Promise<Transaction | null> {
  const currentPlatform = getPlatform();

  if (currentPlatform === "desktop") {
    try {
      const response = await invokeDesktopFilteredTransactions({
        filters: { types: ["initial_balance"] },
        pagination: { limit: 10 },
      });
      const rows = response.transactions ?? [];
      return (
        rows.find((row: Transaction) => !!row.is_chomesh === isChomesh) ?? null
      );
    } catch (error) {
      logger.error(
        "Error fetching initial balance transaction (Desktop):",
        error
      );
      return null;
    }
  } else if (currentPlatform === "web") {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("type", "initial_balance")
        .eq("is_chomesh", isChomesh)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Transaction | null;
    } catch (error) {
      logger.error("Error fetching initial balance transaction (Web):", error);
      return null;
    }
  }
  return null;
}

/**
 * Fetches the maaser-pot initial balance (backward compatible default).
 */
export async function getInitialBalanceTransaction(): Promise<Transaction | null> {
  return getInitialBalanceForPot(false);
}

/**
 * Returns the number of transactions for the current user/platform.
 * Web uses a head count query; desktop uses the Tauri count command.
 */
export async function getTransactionsCount(): Promise<number> {
  const currentPlatform = getPlatform();

  if (currentPlatform === "desktop") {
    try {
      return await invoke<number>("get_transactions_count");
    } catch (error) {
      logger.error("Error counting transactions (Desktop):", error);
      return 0;
    }
  }

  if (currentPlatform === "web") {
    try {
      const { count, error } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count ?? 0;
    } catch (error) {
      logger.error("Error counting transactions (Web):", error);
      return 0;
    }
  }

  return 0;
}

/**
 * Checks if there are ANY transactions in the database.
 * Useful for determining if currency settings should be locked.
 */
export async function hasAnyTransaction(): Promise<boolean> {
  return (await getTransactionsCount()) > 0;
}

/**
 * Adds a single transaction.
 * On desktop, saves to SQLite via Tauri.
 * On web, saves to Supabase.
 */
export async function addTransaction(transaction: Transaction): Promise<void> {
  const currentPlatform = getPlatform();
  if (currentPlatform === "desktop") {
    try {
      await invoke("add_transaction", { transaction });
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      logger.error("Error invoking add_transaction:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated for Supabase operation.");
      }
      const userId = user.id;

      const transactionToInsert: Partial<Transaction> & Record<string, unknown> = {
        ...transaction,
        user_id: userId,
      };

      // Clean up fields that should not be sent on insert
      delete transactionToInsert["is_recurring"];
      delete transactionToInsert["recurring_day_of_month"];
      delete transactionToInsert["recurring_total_count"];
      delete transactionToInsert["recurring_info"];
      delete transactionToInsert.id;

      const { data: insertedData, error: insertError } = await supabase
        .from("transactions")
        .insert(transactionToInsert)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertedData)
        throw new Error(
          "Failed to retrieve inserted transaction data from Supabase."
        );

      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      logger.error("Error adding transaction to Supabase:", error);
      throw error;
    }
  } else {
    throw new Error("Cannot add transaction: Platform not initialized.");
  }
}

/**
 * Deletes a single transaction by its ID.
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  const currentPlatform = getPlatform();
  logger.log(
    `TransactionsService: Deleting transaction ID: ${transactionId}. Platform: ${currentPlatform}`
  );

  if (currentPlatform === "desktop") {
    try {
      await invoke("delete_transaction_handler", { transactionId });
      logger.log(
        `TransactionsService: Tauri delete successful for ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      logger.error(
        `TransactionsService: Error invoking delete_transaction_handler for ID ${transactionId}:`,
        error
      );
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated for Supabase operation.");
      }

      const { error } = await supabase.rpc("delete_user_transaction", {
        p_transaction_id: transactionId,
        p_user_id: user.id,
      });

      if (error) {
        logger.error(
          `TransactionsService: Error deleting transaction ID ${transactionId} from Supabase (RPC):`,
          error
        );
        throw error;
      }
      logger.log(
        `TransactionsService: Supabase delete successful for ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      logger.error(
        `TransactionsService: Error deleting transaction ID ${transactionId} from Supabase (catch block):`,
        error
      );
      throw error;
    }
  } else {
    throw new Error(
      "Cannot delete transaction: Platform not initialized or unknown."
    );
  }

  trackProductEvent("transaction_deleted");
}

export interface TransactionUpdatePayload {
  date?: string;
  amount?: number;
  currency?: string;
  description?: string | null;
  type?: string;
  category?: string | null;
  is_chomesh?: boolean;
  recipient?: string | null;
  payment_method?: string | null;
  original_amount?: number | null;
  original_currency?: string | null;
  conversion_rate?: number | null;
  conversion_date?: string | null;
  rate_source?: string | null;
}

/**
 * Updates a single transaction by its ID.
 */
export async function updateTransaction(
  transactionId: string,
  payload: TransactionUpdatePayload
): Promise<void> {
  const currentPlatform = getPlatform();
  logger.log(
    `TransactionsService: Updating transaction ${transactionId}. Platform: ${currentPlatform}`
  );

  if (Object.keys(payload).length === 0) {
    logger.warn(
      `TransactionsService: Update for transaction ${transactionId} was called with an empty payload. Aborting.`
    );
    return;
  }

  // Sanitize payload to only include keys defined in TransactionUpdatePayload
  const sanitizedPayload: TransactionUpdatePayload = {};
  if (payload.date !== undefined) sanitizedPayload.date = payload.date;
  if (payload.amount !== undefined) sanitizedPayload.amount = payload.amount;
  if (payload.currency !== undefined)
    sanitizedPayload.currency = payload.currency;
  if (payload.description !== undefined)
    sanitizedPayload.description = payload.description;
  if (payload.type !== undefined) sanitizedPayload.type = payload.type;
  if (payload.category !== undefined)
    sanitizedPayload.category = payload.category;
  if (payload.is_chomesh !== undefined)
    sanitizedPayload.is_chomesh = payload.is_chomesh;
  if (payload.recipient !== undefined)
    sanitizedPayload.recipient = payload.recipient;
  if (payload.payment_method !== undefined)
    sanitizedPayload.payment_method = payload.payment_method;
  if (payload.original_amount !== undefined)
    sanitizedPayload.original_amount = payload.original_amount;
  if (payload.original_currency !== undefined)
    sanitizedPayload.original_currency = payload.original_currency;
  if (payload.conversion_rate !== undefined)
    sanitizedPayload.conversion_rate = payload.conversion_rate;
  if (payload.conversion_date !== undefined)
    sanitizedPayload.conversion_date = payload.conversion_date;
  if (payload.rate_source !== undefined)
    sanitizedPayload.rate_source = payload.rate_source;

  logger.log(
    `TransactionsService: Cleaned payload for transaction ${transactionId}:`,
    sanitizedPayload
  );

  if (currentPlatform === "desktop") {
    try {
      await invoke("update_transaction_handler", {
        id: transactionId,
        payload: sanitizedPayload,
      });
      logger.log(
        `TransactionsService: Tauri update successful for ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      logger.error(
        `TransactionsService: Error invoking update_transaction_handler for ID ${transactionId}:`,
        error
      );
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User not authenticated for Supabase operation.");
      }

      const { data, error } = await supabase.rpc("update_user_transaction", {
        p_transaction_id: transactionId,
        p_user_id: user.id,
        p_updates: sanitizedPayload,
      });

      if (error) {
        logger.error(
          `TransactionsService: Error updating transaction ID ${transactionId} in Supabase (RPC):`,
          error
        );
        throw error;
      }

      logger.log(
        `TransactionsService: Supabase update successful for transaction:`,
        data
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      logger.error(
        `TransactionsService: Error updating transaction ID ${transactionId} in Supabase (catch block):`,
        error
      );
      throw error;
    }
  } else {
    throw new Error(
      "Cannot update transaction: Platform not initialized or unknown."
    );
  }

  trackProductEvent("transaction_updated", {
    fields_changed: Object.keys(sanitizedPayload),
    type: sanitizedPayload.type,
  });
}

function validateBulkIds(ids: readonly string[]): string[] {
  if (ids.length === 0) {
    throw new Error("Bulk action requires at least one id");
  }

  const normalizedIds = ids.map((id) => id.trim());
  if (normalizedIds.some((id) => id.length === 0)) {
    throw new Error("Bulk action ids must not be empty");
  }

  if (new Set(normalizedIds).size !== normalizedIds.length) {
    throw new Error("Bulk action ids must be unique");
  }

  return normalizedIds;
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated for Supabase operation.");
  }

  return user.id;
}

function readAffectedCount(data: unknown): number {
  if (typeof data === "number") {
    return data;
  }

  throw new Error("Bulk action did not return an affected count.");
}

function verifyAffectedCount(
  entityName: string,
  expectedCount: number,
  affectedCount: number,
): void {
  if (affectedCount !== expectedCount) {
    throw new Error(
      `Expected to affect ${expectedCount} ${entityName}, affected ${affectedCount}`,
    );
  }
}

export async function bulkDeleteTransactions(
  ids: readonly string[],
): Promise<void> {
  const validatedIds = validateBulkIds(ids);
  const currentPlatform = getPlatform();

  if (currentPlatform === "web") {
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase.rpc("bulk_delete_user_transactions", {
      p_user_id: userId,
      p_ids: validatedIds,
    });

    if (error) {
      throw error;
    }

    verifyAffectedCount(
      "transactions",
      validatedIds.length,
      readAffectedCount(data),
    );
    useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    return;
  }

  if (currentPlatform === "desktop") {
    const affectedCount = await invoke<number>("bulk_delete_transactions_handler", {
      ids: validatedIds,
    });
    verifyAffectedCount("transactions", validatedIds.length, affectedCount);
    useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    return;
  }

  throw new Error("Cannot bulk delete transactions: Platform not initialized.");
}

export async function bulkUpdateTransactions(
  ids: readonly string[],
  change: TransactionBulkChange,
): Promise<void> {
  const validatedIds = validateBulkIds(ids);
  const currentPlatform = getPlatform();

  if (currentPlatform === "web") {
    const userId = await getAuthenticatedUserId();
    const { data, error } = await supabase.rpc("bulk_update_user_transactions", {
      p_user_id: userId,
      p_ids: validatedIds,
      p_field: change.field,
      p_value: change.value,
    });

    if (error) {
      throw error;
    }

    verifyAffectedCount(
      "transactions",
      validatedIds.length,
      readAffectedCount(data),
    );
    useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    return;
  }

  if (currentPlatform === "desktop") {
    const affectedCount = await invoke<number>("bulk_update_transactions_handler", {
      ids: validatedIds,
      field: change.field,
      value: change.value,
    });
    verifyAffectedCount("transactions", validatedIds.length, affectedCount);
    useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    return;
  }

  throw new Error("Cannot bulk update transactions: Platform not initialized.");
}
