import { useDonationStore } from "../store";
import { Transaction } from "@/types/transaction";
import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

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
      const { invoke } = await import("@tauri-apps/api/core");
      const transactions = await invoke<Transaction[]>("get_transactions");
      logger.log(
        `TransactionsService: Tauri load successful: ${transactions.length} transactions.`
      );
      return transactions;
    } catch (error) {
      logger.error("Error invoking get_transactions:", error);
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
    } catch (errorCaught: any) {
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
 * Adds a single transaction.
 * On desktop, saves to SQLite via Tauri.
 * On web, saves to Supabase.
 */
export async function addTransaction(transaction: Transaction): Promise<void> {
  const currentPlatform = getPlatform();
  logger.log("Current platform in addTransaction:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("add_transaction", { transaction });
      logger.log(
        "Tauri invoke add_transaction successful for ID:",
        transaction.id
      );
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

      const transactionToInsert = {
        ...transaction,
        user_id: userId,
      };

      // Clean up fields that should not be sent on insert
      delete (transactionToInsert as any).is_recurring;
      delete (transactionToInsert as any).recurring_day_of_month;
      delete (transactionToInsert as any).recurring_total_count;
      delete (transactionToInsert as any).recurring_info;
      delete (transactionToInsert as any).id;

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

      logger.log("Supabase insert successful. ID:", insertedData.id);

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
      const { invoke } = await import("@tauri-apps/api/core");
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
      const { invoke } = await import("@tauri-apps/api/core");
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
}
