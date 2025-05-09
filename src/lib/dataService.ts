import { useDonationStore } from "./store";
import { Transaction } from "../types/transaction";
import { PlatformContextType } from "@/contexts/PlatformContext";
import { invoke } from "@tauri-apps/api";
import { supabase } from "@/lib/supabaseClient"; // Import Supabase client

// פונקציה לקבלת הפלטפורמה (יש להפעיל אותה מהקומפוננטה הראשית)
let currentPlatform: PlatformContextType["platform"] = "loading";
export function setDataServicePlatform(
  platform: PlatformContextType["platform"]
) {
  currentPlatform = platform;
}

// --- New CRUD API for Transactions ---

/**
 * Loads all transactions based on the current platform.
 * On desktop, fetches from SQLite via Tauri.
 * On web, fetches from Supabase.
 */
export async function loadTransactions(
  userIdFromAuthContext?: string
): Promise<Transaction[]> {
  console.log("DataService: Loading transactions. Platform:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      const transactions = await invoke<Transaction[]>("get_transactions");
      console.log(
        `DataService: Tauri load successful: ${transactions.length} transactions.`
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
          "DataService: UserID not provided from AuthContext. Falling back to supabase.auth.getUser()."
        );
        const {
          data: { user: supabaseUser },
          error: supabaseUserError,
        } = await supabase.auth.getUser();
        if (supabaseUserError) {
          console.error(
            "DataService (Fallback): Error getting user from Supabase:",
            supabaseUserError
          );
          throw supabaseUserError;
        }
        if (!supabaseUser) {
          console.error("DataService (Fallback): No user session found.");
          throw new Error(
            "No user session for loading transactions (fallback in loadTransactions)."
          );
        }
        userIdToQueryWith = supabaseUser.id;
      }

      // RLS in Supabase should handle scoping transactions to the authenticated user.
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        console.error("DataService: Supabase select returned an error:", error);
        throw error;
      }

      console.log(
        `DataService: Supabase load successful: ${
          data?.length || 0
        } transactions.`
      );
      return (data as Transaction[]) || [];
    } catch (errorCaught: any) {
      console.error(
        "DataService: Error explicitly caught in loadTransactions (Supabase block):",
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
    // Loading state or uninitialized platform
    console.log(
      "DataService: Platform not yet determined, returning empty transactions."
    );
    return [];
  }
}

/**
 * Adds a single transaction.
 * On desktop, saves to SQLite via Tauri and then updates the Zustand store.
 * On web, saves to Supabase and then updates the Zustand store.
 */
export async function addTransaction(transaction: Transaction): Promise<void> {
  console.log("Current platform in addTransaction:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      console.log("Attempting to add transaction via Tauri invoke...");
      await invoke("add_transaction", { transaction });
      console.log(
        "Tauri invoke add_transaction successful for ID:",
        transaction.id
      );
      // Update store only after successful DB operation
      useDonationStore.getState().addTransaction(transaction);
      console.log("Zustand store updated with new transaction.");
    } catch (error) {
      console.error("Error invoking add_transaction:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    console.log("Web platform: Attempting to add transaction via Supabase...");
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("User not authenticated for Supabase operation.");
      }
      const userId = user.id;

      // Prepare data for Supabase insert:
      // Explicitly map fields from the original 'transaction' object (mixed case)
      // to the target DB column names (camelCase, except user_id and id which is omitted)
      const transactionToInsert = {
        // Target DB Column Name (camelCase) : Source TS Object Field (mixed case)
        user_id: userId, // Keep snake_case
        date: transaction.date,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        type: transaction.type,
        category: transaction.category,
        isChomesh: transaction.isChomesh, // camelCase DB <- camelCase TS (assumed)
        isRecurring: transaction.is_recurring, // camelCase DB <- snake_case TS (from logs)
        recurringDayOfMonth: transaction.recurring_day_of_month, // camelCase DB <- snake_case TS (from logs)
        recurringTotalCount: transaction.recurringTotalCount, // camelCase DB <- camelCase TS
        // id, createdAt, updatedAt are handled by DB
      };

      // Ensure undefined becomes null
      Object.keys(transactionToInsert).forEach((key) => {
        if ((transactionToInsert as Record<string, any>)[key] === undefined) {
          (transactionToInsert as Record<string, any>)[key] = null;
        }
      });

      console.log(
        "Object being sent to Supabase insert (explicitly mapped fields):",
        transactionToInsert
      );

      // Insert and select the newly created row
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

      console.log(
        "Supabase insert successful. DB generated ID:",
        insertedData.id
      );

      // Map the returned data (DB columns, camelCase) back to Transaction type for the store
      const transactionForStore: Transaction = {
        id: insertedData.id,
        user_id: insertedData.user_id,
        date: insertedData.date,
        amount: insertedData.amount,
        currency: insertedData.currency,
        description: insertedData.description,
        type: insertedData.type,
        category: insertedData.category,
        isChomesh: insertedData.isChomesh, // map from DB
        is_recurring: insertedData.isRecurring, // map back to snake_case for TS type
        recurring_day_of_month: insertedData.recurringDayOfMonth, // map back to snake_case for TS type
        recurringTotalCount: insertedData.recurringTotalCount, // map from DB
        createdAt: insertedData.createdAt,
        updatedAt: insertedData.updatedAt,
      };

      // Update store using the data returned from the database
      useDonationStore.getState().addTransaction(transactionForStore);
      console.log("Zustand store updated with DB-generated transaction.");
    } catch (error) {
      console.error("Error adding transaction to Supabase:", error);
      throw error; // Re-throw error
    }
  } else {
    // Loading state or uninitialized platform
    console.log("Platform not yet determined, cannot add transaction.");
    // Optionally throw an error or handle gracefully
    throw new Error("Cannot add transaction: Platform not initialized.");
  }
}

export async function clearAllData() {
  console.log("Attempting to clear all data...");
  if (currentPlatform === "desktop") {
    try {
      console.log("Invoking clear_all_data...");
      await invoke("clear_all_data"); // This now clears transactions table too
      console.log("SQLite data cleared successfully via invoke.");
    } catch (error) {
      console.error("Error invoking clear_all_data:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    // TODO: Implement clearing user-specific data in Supabase
    // This would likely involve deleting rows from 'transactions' table
    // matching the current user ID. BE VERY CAREFUL HERE.
    console.warn(
      "Web platform: clearAllData for Supabase not yet implemented."
    );
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
        console.log("Supabase transactions cleared for user:", user.id);
      } else {
        console.log("No user session found, skipping Supabase clear.");
      }
    } catch (error) {
      console.error("Error clearing Supabase transactions:", error);
      // Decide if we should still clear Zustand store
      // For now, let's continue to clear the store even if DB clear fails
    }
  }

  // Clear the Zustand store (include transactions)
  console.log("Clearing Zustand store...");
  useDonationStore.setState({
    transactions: [], // Clear new transactions array
  });
  console.log("Zustand store cleared.");
}
