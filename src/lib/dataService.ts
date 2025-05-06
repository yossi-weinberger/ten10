import { useDonationStore } from "./store";
import { Transaction } from "../types/transaction";
import { PlatformContextType } from "@/contexts/PlatformContext";
import { invoke } from "@tauri-apps/api";
import { supabase } from "@/lib/supabaseClient"; // Import Supabase client
import { nanoid } from "nanoid";

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
export async function loadTransactions(): Promise<Transaction[]> {
  console.log("Current platform in loadTransactions:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      console.log(
        "About to call invoke for: get_transactions on platform:",
        currentPlatform
      );
      const transactions = await invoke<Transaction[]>("get_transactions");
      console.log(
        `Tauri invoke get_transactions successful: loaded ${transactions.length} transactions.`
      );
      return transactions;
    } catch (error) {
      console.error("Error invoking get_transactions:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    console.log(
      "Web platform: Attempting to load transactions via Supabase..."
    );
    try {
      // RLS ensures only user's transactions are returned
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) {
        console.error(">>> Supabase fetch RAW error:", error);
        throw error;
      }

      console.log(">>> Raw data received from Supabase:", data);

      // Map the snake_case data from Supabase to the Transaction interface
      const transactions: Transaction[] =
        data?.map((item) => ({
          id: item.id,
          user_id: item.user_id,
          date: item.date,
          amount: item.amount,
          currency: item.currency,
          description: item.description,
          type: item.type,
          category: item.category,
          is_chomesh: item.is_chomesh, // Use snake_case from DB
          recipient: item.recipient,
          is_recurring: item.is_recurring, // Use snake_case from DB
          recurring_day_of_month: item.recurring_day_of_month, // Use snake_case from DB
          created_at: item.created_at, // Use snake_case from DB
          updated_at: item.updated_at, // Use snake_case from DB
          original_id: item.original_id, // Use snake_case from DB
          supabase_id: item.supabase_id, // Use snake_case from DB
          // --- Add potentially needed legacy camelCase fields if UI depends on them ---
          // isChomesh: item.is_chomesh,
          // isRecurring: item.is_recurring,
          // recurringDayOfMonth: item.recurring_day_of_month,
          // createdAt: item.created_at,
          // updatedAt: item.updated_at,
        })) || [];

      console.log(">>> Successfully mapped transactions:", transactions);
      return transactions;

      // console.log(">>> TEMP: Returning data directly without mapping");
      // return (data as Transaction[]) || [];
    } catch (error) {
      console.error(">>> Supabase fetch error in loadTransactions:", error);
      return [];
    }
  } else {
    // Loading state or uninitialized platform
    console.log("Platform not yet determined, returning empty transactions.");
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
      console.log(
        "About to call invoke for: add_transaction on platform:",
        currentPlatform
      );
      console.log("Attempting to add transaction via Tauri invoke...");

      // If this transaction has a supabase_id, it means it's being imported from Supabase
      // Otherwise we're creating a new transaction
      const transactionToSave = { ...transaction };

      await invoke("add_transaction", { transaction: transactionToSave });
      console.log(
        "Tauri invoke add_transaction successful for ID:",
        transactionToSave.id
      );
      // Update store only after successful DB operation
      useDonationStore.getState().addTransaction(transactionToSave);
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

      // If this is a desktop transaction being imported, save its original ID
      const original_id = transaction.id.startsWith("desktop_")
        ? transaction.id
        : undefined;

      // Prepare data for Supabase insert using snake_case fields
      const transactionToInsert = {
        user_id: userId,
        date: transaction.date,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        type: transaction.type,
        category: transaction.category,
        is_chomesh: transaction.is_chomesh || transaction.isChomesh, // Support both naming conventions
        recipient: transaction.recipient,
        is_recurring: transaction.is_recurring,
        recurring_day_of_month: transaction.recurring_day_of_month,
        original_id, // Store original desktop ID if applicable
        // id, created_at, updated_at are handled by DB
      };

      // Ensure undefined becomes null
      Object.keys(transactionToInsert).forEach((key) => {
        if ((transactionToInsert as Record<string, any>)[key] === undefined) {
          (transactionToInsert as Record<string, any>)[key] = null;
        }
      });

      console.log(
        "Object being sent to Supabase insert (snake_case fields):",
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

      // Map the returned data to Transaction type for the store
      const transactionForStore: Transaction = {
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
        is_recurring: insertedData.is_recurring,
        recurring_day_of_month: insertedData.recurring_day_of_month,
        created_at: insertedData.created_at,
        updated_at: insertedData.updated_at,
        original_id: insertedData.original_id,
        // Legacy fields for backward compatibility
        isChomesh: insertedData.is_chomesh,
        createdAt: insertedData.created_at,
        updatedAt: insertedData.updated_at,
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
      console.log(
        "About to call invoke for: clear_all_data on platform:",
        currentPlatform
      );
      console.log("Invoking clear_all_data...");
      await invoke("clear_all_data"); // This now clears transactions table too
      console.log("SQLite data cleared successfully via invoke.");
    } catch (error) {
      console.error("Error invoking clear_all_data:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    // Implement clearing user-specific data in Supabase
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

// --- New Import/Export Functions ---

/**
 * Exports all transactions from the current platform to a JSON string.
 * This can be saved to a file or copied to clipboard.
 */
export async function exportTransactionsToJson(): Promise<string> {
  // Get all transactions from the current platform
  const transactions = await loadTransactions();

  // Create an export object with metadata
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      source: currentPlatform,
      version: "1.0",
    },
    transactions,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Imports transactions from a JSON string.
 * This allows loading transactions from an export file.
 *
 * @param jsonData JSON string containing transactions to import
 * @param replace If true, will clear existing transactions before import
 * @returns Number of transactions successfully imported
 */
export async function importTransactionsFromJson(
  jsonData: string,
  replace: boolean = false
): Promise<number> {
  try {
    // Parse the JSON data
    const importData = JSON.parse(jsonData);

    // Validate the import data structure
    if (!importData.transactions || !Array.isArray(importData.transactions)) {
      throw new Error("Invalid import data: transactions array not found");
    }

    // Clear existing data if requested
    if (replace) {
      await clearAllData();
    }

    const transactions: Transaction[] = importData.transactions;
    const sourceType = importData.metadata?.source || "unknown";

    // Process import based on source and current platform
    if (currentPlatform === "desktop") {
      // When importing to desktop
      if (sourceType === "web") {
        // From web to desktop: need to generate new IDs, store original supabase_id
        for (const transaction of transactions) {
          const newTransaction: Transaction = {
            ...transaction,
            id: nanoid(), // Generate new ID for SQLite
            supabase_id: transaction.id, // Store original Supabase ID
          };
          await addTransaction(newTransaction);
        }
      } else {
        // From desktop to desktop: keep original IDs
        for (const transaction of transactions) {
          await addTransaction(transaction);
        }
      }
    } else if (currentPlatform === "web") {
      // When importing to web
      if (sourceType === "desktop") {
        // From desktop to web: let Supabase generate IDs, store original_id
        for (const transaction of transactions) {
          const newTransaction: Transaction = {
            ...transaction,
            id: `desktop_${transaction.id}`, // Temporary ID that will be replaced by Supabase
            original_id: transaction.id,
          };
          await addTransaction(newTransaction);
        }
      } else {
        // From web to web: not likely needed, but keep original IDs
        for (const transaction of transactions) {
          // Remove the ID to let Supabase generate a new one
          const { id, ...transactionWithoutId } = transaction;
          const newTransaction: Transaction = {
            ...transactionWithoutId,
            id: `web_import_${nanoid()}`, // Temporary ID that will be replaced
          };
          await addTransaction(newTransaction);
        }
      }
    }

    return transactions.length;
  } catch (error: any) {
    console.error("Error importing transactions:", error);
    throw new Error(`Failed to import transactions: ${error.message}`);
  }
}
