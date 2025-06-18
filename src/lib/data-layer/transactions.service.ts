import { useDonationStore } from "../store";
import { Transaction } from "@/types/transaction";
import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";

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
  console.log(
    "TransactionsService: Loading transactions. Platform:",
    currentPlatform
  );
  if (currentPlatform === "desktop") {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const transactions = await invoke<Transaction[]>("get_transactions");
      console.log(
        `TransactionsService: Tauri load successful: ${transactions.length} transactions.`
      );
      return transactions;
    } catch (error) {
      console.error("Error invoking get_transactions:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      let userIdToQueryWith = userIdFromAuthContext;

      if (!userIdToQueryWith) {
        console.warn(
          "TransactionsService: UserID not provided from AuthContext. Falling back to supabase.auth.getUser()."
        );
        const {
          data: { user: supabaseUser },
          error: supabaseUserError,
        } = await supabase.auth.getUser();
        if (supabaseUserError) {
          console.error(
            "TransactionsService (Fallback): Error getting user from Supabase:",
            supabaseUserError
          );
          throw supabaseUserError;
        }
        if (!supabaseUser) {
          console.error(
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
        console.error(
          "TransactionsService: Supabase select returned an error:",
          error
        );
        throw error;
      }

      console.log(
        `TransactionsService: Supabase load successful: ${
          data?.length || 0
        } transactions.`
      );
      return (data as Transaction[]) || [];
    } catch (errorCaught: any) {
      console.error(
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
    console.log(
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
  console.log("Current platform in addTransaction:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("add_transaction", { transaction });
      console.log(
        "Tauri invoke add_transaction successful for ID:",
        transaction.id
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error("Error invoking add_transaction:", error);
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

      console.log("Supabase insert successful. ID:", insertedData.id);

      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error("Error adding transaction to Supabase:", error);
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
  console.log(
    `TransactionsService: Deleting transaction ID: ${transactionId}. Platform: ${currentPlatform}`
  );

  if (currentPlatform === "desktop") {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("delete_transaction_handler", { transactionId });
      console.log(
        `TransactionsService: Tauri delete successful for ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error(
        `TransactionsService: Error invoking delete_transaction_handler for ID ${transactionId}:`,
        error
      );
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (error) {
        console.error(
          `TransactionsService: Error deleting transaction ID ${transactionId} from Supabase:`,
          error
        );
        throw error;
      }
      console.log(
        `TransactionsService: Supabase delete successful for ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error(
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
}

/**
 * Updates a single transaction by its ID.
 */
export async function updateTransaction(
  transactionId: string,
  payload: TransactionUpdatePayload
): Promise<void> {
  const currentPlatform = getPlatform();
  console.log(
    `TransactionsService: Updating transaction ${transactionId}. Platform: ${currentPlatform}`
  );

  if (Object.keys(payload).length === 0) {
    console.warn(
      "TransactionsService: updateTransaction called with an empty payload."
    );
  }

  if (currentPlatform === "desktop") {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("update_transaction_handler", {
        id: transactionId,
        payload,
      });
      console.log(
        `TransactionsService: Tauri update successful for ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error(
        `TransactionsService: Error invoking update_transaction_handler for ID ${transactionId}:`,
        error
      );
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const snakeCasePayload: { [key: string]: any } = {};
      for (const key in payload) {
        if (Object.prototype.hasOwnProperty.call(payload, key)) {
          const snakeKey = key.replace(
            /[A-Z]/g,
            (letter) => `_${letter.toLowerCase()}`
          );
          snakeCasePayload[snakeKey] = (payload as any)[key];
        }
      }

      console.log(
        "TransactionsService: Supabase update payload (snake_case):",
        snakeCasePayload
      );

      const { data, error } = await supabase
        .from("transactions")
        .update(snakeCasePayload)
        .eq("id", transactionId)
        .select();

      if (error) {
        console.error(
          `TransactionsService: Error updating transaction ID ${transactionId} in Supabase:`,
          error
        );
        throw error;
      }
      if (!data || data.length === 0) {
        console.warn(
          `TransactionsService: Supabase update for ID ${transactionId} completed, but no data returned. This might be expected.`
        );
      }
      console.log(
        `TransactionsService: Supabase update successful for ID: ${transactionId}.`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error(
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
