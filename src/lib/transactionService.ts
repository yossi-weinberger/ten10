import { invoke } from "@tauri-apps/api";
import { supabase } from "@/lib/supabaseClient";
import { Transaction } from "../types/transaction";
import { getCurrentPlatform } from "./platformService";

/**
 * Loads all transactions from the backend based on the current platform.
 */
export async function loadTransactionsFromBackend(
  userIdFromAuthContext?: string
): Promise<Transaction[]> {
  const currentPlatform = getCurrentPlatform();
  console.log(
    "TransactionService: Loading transactions from backend. Platform:",
    currentPlatform
  );
  if (currentPlatform === "desktop") {
    try {
      const transactions = await invoke<Transaction[]>("get_transactions");
      console.log(
        `TransactionService: Tauri load successful: ${transactions.length} transactions.`
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
          "TransactionService: UserID not provided. Falling back to supabase.auth.getUser()."
        );
        const {
          data: { user: supabaseUser },
          error: supabaseUserError,
        } = await supabase.auth.getUser();
        if (supabaseUserError) {
          console.error(
            "TransactionService (Fallback): Error getting user from Supabase:",
            supabaseUserError
          );
          throw supabaseUserError;
        }
        if (!supabaseUser) {
          console.error(
            "TransactionService (Fallback): No user session found."
          );
          throw new Error(
            "No user session for loading transactions (fallback)."
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
          "TransactionService: Supabase select returned an error:",
          error
        );
        throw error;
      }
      console.log(
        `TransactionService: Supabase load successful: ${
          data?.length || 0
        } transactions.`
      );
      return (data as Transaction[]) || [];
    } catch (errorCaught: any) {
      console.error(
        "TransactionService: Error in loadTransactionsFromBackend (Supabase block):",
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
      "TransactionService: Platform not yet determined, returning empty transactions."
    );
    return [];
  }
}

/**
 * Adds a single transaction to the backend.
 * Returns the added transaction (especially important for web to get DB-generated fields).
 */
export async function addTransactionToBackend(
  transaction: Transaction
): Promise<Transaction> {
  const currentPlatform = getCurrentPlatform();
  console.log(
    "TransactionService: Adding transaction to backend. Platform:",
    currentPlatform
  );
  if (currentPlatform === "desktop") {
    try {
      await invoke("add_transaction", { transaction });
      console.log(
        "TransactionService: Tauri invoke add_transaction successful for ID:",
        transaction.id
      );
      return transaction; // For desktop, the input transaction is what's saved.
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
        user_id: userId,
        date: transaction.date,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description ?? null,
        type: transaction.type,
        category: transaction.category ?? null,
        is_chomesh: transaction.is_chomesh ?? null,
        recipient: transaction.recipient ?? null,
        is_recurring: transaction.is_recurring ?? null,
        recurring_day_of_month: transaction.recurring_day_of_month ?? null,
        recurring_total_count: transaction.recurring_total_count ?? null,
      };

      Object.keys(transactionToInsert).forEach((key) => {
        if ((transactionToInsert as Record<string, any>)[key] === undefined) {
          (transactionToInsert as Record<string, any>)[key] = null;
        }
      });

      const { data: insertedData, error: insertError } = await supabase
        .from("transactions")
        .insert(transactionToInsert)
        .select()
        .single();

      if (insertError) throw insertError;
      if (!insertedData) {
        throw new Error(
          "Failed to retrieve inserted transaction data from Supabase."
        );
      }
      console.log(
        "TransactionService: Supabase insert successful. DB returned data. ID:",
        insertedData.id
      );
      // Map Supabase snake_case to Transaction type (already snake_case)
      return {
        id: insertedData.id,
        user_id: insertedData.user_id,
        date: insertedData.date,
        amount: insertedData.amount,
        currency: insertedData.currency,
        description: insertedData.description,
        type: insertedData.type,
        category: insertedData.category,
        is_chomesh: insertedData.is_chomesh,
        recipient: insertedData.recipient,
        created_at: insertedData.created_at,
        updated_at: insertedData.updated_at,
        is_recurring: insertedData.is_recurring,
        recurring_day_of_month: insertedData.recurring_day_of_month,
        recurring_total_count: insertedData.recurring_total_count,
      } as Transaction;
    } catch (error) {
      console.error("Error adding transaction to Supabase:", error);
      throw error;
    }
  } else {
    console.error(
      "TransactionService: Platform not yet determined, cannot add transaction."
    );
    throw new Error("Cannot add transaction: Platform not initialized.");
  }
}

/**
 * Clears all transaction data from the backend.
 */
export async function clearAllTransactionsInBackend(): Promise<void> {
  const currentPlatform = getCurrentPlatform();
  console.log(
    "TransactionService: Clearing all transactions in backend. Platform:",
    currentPlatform
  );
  if (currentPlatform === "desktop") {
    try {
      await invoke("clear_all_data"); // This command clears transactions in SQLite
      console.log(
        "TransactionService: SQLite transactions cleared successfully via invoke."
      );
    } catch (error) {
      console.error("Error invoking clear_all_data:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("user_id", user.id);
        if (error) throw error;
        console.log(
          "TransactionService: Supabase transactions cleared for user:",
          user.id
        );
      } else {
        console.log(
          "TransactionService: No user session found, skipping Supabase transaction clear."
        );
      }
    } catch (error) {
      console.error("Error clearing Supabase transactions:", error);
      throw error; // Re-throw so the caller can decide on store clearing
    }
  } else {
    console.error(
      "TransactionService: Platform not determined, cannot clear data."
    );
    throw new Error("Cannot clear data: Platform not initialized.");
  }
}
