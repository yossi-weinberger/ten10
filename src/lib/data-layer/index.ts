import { useDonationStore } from "../store";
import { Transaction, RecurringTransaction } from "../../types/transaction";
import { TransactionFormValues } from "../../types/forms";
import {
  createRecurringTransaction,
  NewRecurringTransaction,
} from "./recurringTransactions.service";
import { nanoid } from "nanoid";
import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";

// The platform is no longer managed here. It is set once in App.tsx
// and retrieved via getPlatform() from the platformManager.

// --- All CRUD functions for Transactions (load, add, delete, update)
// --- and all calculation functions (fetch*) have been MOVED to their respective services.
// --- This file now contains higher-level logic and orchestrators.

/**
 * Adds a new recurring transaction definition.
 * This is currently a DESKTOP-ONLY operation.
 * On desktop, saves to recurring_transactions table via Tauri.
 */
export async function addRecurringTransaction(
  recTransaction: RecurringTransaction
): Promise<void> {
  const currentPlatform = getPlatform();
  console.log("Current platform in addRecurringTransaction:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      console.log(
        "Attempting to add recurring transaction via Tauri invoke..."
      );
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("add_recurring_transaction_handler", { recTransaction });
      console.log(
        "Tauri invoke add_recurring_transaction_handler successful for ID:",
        recTransaction.id
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error("Error invoking add_recurring_transaction_handler:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    console.warn(
      "addRecurringTransaction is a desktop-only function in dataService. Web should use its own service."
    );
    throw new Error("This function is not implemented for the web platform.");
  } else {
    console.log(
      "Platform not yet determined, cannot add recurring transaction."
    );
    throw new Error(
      "Cannot add recurring transaction: Platform not initialized."
    );
  }
}

export async function clearAllData() {
  const currentPlatform = getPlatform();
  console.log("DataService: Clearing all data. Platform:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      console.log("Invoking clear_all_data...");
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("clear_all_data");
      console.log("SQLite data cleared successfully via invoke.");
    } catch (error) {
      console.error("Error invoking clear_all_data:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
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
    }
  }

  console.log("Clearing Zustand store...");
  useDonationStore.setState({
    lastDbFetchTimestamp: null,
  });
  console.log("Zustand store cleared.");
}

// The handleTransactionSubmit function has been removed from this file.
// Its sole responsibility is now within transactionFormService.ts.

// Re-exporting functions from the new service files
// This allows other parts of the app to keep their existing imports from dataService.ts
// It acts as a facade, which can be a good pattern during refactoring.
export {
  loadTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
} from "./transactions.service";
export type { TransactionUpdatePayload } from "./transactions.service";

export {
  fetchTotalIncomeInRange,
  fetchTotalExpensesInRange,
  fetchTotalDonationsInRange,
  fetchServerTitheBalance,
} from "./analytics.service";
export type { ServerIncomeData, ServerDonationData } from "./analytics.service";
