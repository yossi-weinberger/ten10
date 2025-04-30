import { useDonationStore } from "./store";
import { Transaction } from "../types/transaction";
import { PlatformContextType } from "@/contexts/PlatformContext";
import { invoke } from "@tauri-apps/api";

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
 * On web, returns an empty array (to be implemented later with Supabase).
 */
export async function loadTransactions(): Promise<Transaction[]> {
  console.log("Current platform in loadTransactions:", currentPlatform);
  if (currentPlatform === "desktop") {
    try {
      console.log("Attempting to load transactions via Tauri invoke...");
      const transactions = await invoke<Transaction[]>("get_transactions");
      console.log(
        `Tauri invoke get_transactions successful: loaded ${transactions.length} transactions.`
      );
      return transactions;
    } catch (error) {
      console.error("Error invoking get_transactions:", error);
      throw error;
    }
  } else {
    // Placeholder for web - fetch from Supabase later
    console.log("Web platform: Returning empty transactions array for now.");
    return [];
  }
}

/**
 * Adds a single transaction.
 * On desktop, saves to SQLite via Tauri and then updates the Zustand store.
 * On web, does nothing (to be implemented later with Supabase).
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
  } else {
    // Placeholder for web - save to Supabase later
    console.log(
      "Web platform: Not adding transaction to store or backend yet."
    );
    // Optionally simulate async for web
    await new Promise((resolve) => setTimeout(resolve, 50));
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
  } else {
    // Placeholder for web - call cloud API endpoint in the future
    console.log("TODO: Call cloud API to clear user data.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Clear the Zustand store (include transactions)
  console.log("Clearing Zustand store...");
  useDonationStore.setState({
    transactions: [], // Clear new transactions array
  });
  console.log("Zustand store cleared.");
}
