import { useDonationStore } from "./store";
import { Transaction } from "../types/transaction";
import { PlatformContextType } from "@/contexts/PlatformContext";
import { invoke } from "@tauri-apps/api/core";
import { supabase } from "@/lib/supabaseClient"; // Import Supabase client

// פונקציה לקבלת הפלטפורמה (יש להפעיל אותה מהקומפוננטה הראשית)
let currentPlatform: PlatformContextType["platform"] = "loading";
export function setDataServicePlatform(
  platform: PlatformContextType["platform"]
) {
  currentPlatform = platform;
}

// Define a type for the data structure returned by server-side calculations
export interface ServerIncomeData {
  total_income: number;
  chomesh_amount: number;
}

// Define a type for the data structure returned by server-side calculations for Donations
export interface ServerDonationData {
  total_donations_amount: number;
  non_tithe_donation_amount: number;
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
      console.log(
        "Desktop transaction added to DB. Zustand store (global list) is no longer updated from here."
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
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

      // The incoming 'transaction' object is already in snake_case (due to Transaction type update)
      // We just need to add user_id and ensure all fields Supabase expects are present or null.
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
        // id, created_at, updated_at are handled by the database.
      };

      // Ensure undefined becomes null - this loop can be kept or removed if '?? null' is sufficient
      Object.keys(transactionToInsert).forEach((key) => {
        if ((transactionToInsert as Record<string, any>)[key] === undefined) {
          (transactionToInsert as Record<string, any>)[key] = null;
        }
      });

      console.log(
        "Object being sent to Supabase insert (now snake_case keys):",
        transactionToInsert
      );

      const { data: insertedData, error: insertError } = await supabase
        .from("transactions")
        .insert(transactionToInsert)
        .select() // Select all columns (which are now snake_case)
        .single();

      if (insertError) throw insertError;
      if (!insertedData)
        throw new Error(
          "Failed to retrieve inserted transaction data from Supabase."
        );

      console.log(
        "Supabase insert successful. DB returned data with snake_case keys. ID:",
        insertedData.id
      );

      console.log(
        "Web transaction added to DB. Zustand store (global list) is no longer updated from here."
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
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

/**
 * Deletes a single transaction by its ID.
 * On desktop, calls Tauri command.
 * On web, calls Supabase.
 */
export async function deleteTransaction(transactionId: string): Promise<void> {
  console.log(
    `DataService: Attempting to delete transaction ID: ${transactionId}. Platform: ${currentPlatform}`
  );

  if (currentPlatform === "desktop") {
    try {
      await invoke("delete_transaction_handler", { transactionId });
      console.log(
        `DataService: Tauri delete_transaction_handler successful for ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error(
        `DataService: Error invoking delete_transaction_handler for ID ${transactionId}:`,
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
          `DataService: Error deleting transaction ID ${transactionId} from Supabase:`,
          error
        );
        throw error;
      }
      console.log(
        `DataService: Supabase delete successful for transaction ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error(
        `DataService: Error deleting transaction ID ${transactionId} from Supabase (catch block):`,
        error
      );
      throw error;
    }
  } else {
    console.warn(
      `DataService: Platform not yet determined. Cannot delete transaction ID: ${transactionId}.`
    );
    throw new Error(
      "Cannot delete transaction: Platform not initialized or unknown."
    );
  }
}

// --- START definition of TransactionUpdatePayload (mirroring Rust's TransactionUpdatePayload) ---
// This should ideally be in a shared types file or derived more directly
// from the main Transaction type if all fields are optional for update.
export interface TransactionUpdatePayload {
  date?: string;
  amount?: number;
  currency?: string;
  description?: string | null; // Allow explicitly setting to null
  type?: string; // Note: in Rust it's type_str, ensure mapping if needed or align names
  category?: string | null; // Allow explicitly setting to null
  is_chomesh?: boolean;
  is_recurring?: boolean;
  recurring_day_of_month?: number | null; // Allow explicitly setting to null if is_recurring is false
  recipient?: string | null; // Allow explicitly setting to null
  // user_id is typically not updated
  // created_at is not updated
  // updated_at is handled by the backend (Rust sets it to CURRENT_TIMESTAMP)
}
// --- END definition of TransactionUpdatePayload ---

/**
 * Updates a single transaction by its ID with the given payload.
 * On desktop, calls Tauri command.
 * On web, calls Supabase.
 */
export async function updateTransaction(
  transactionId: string,
  payload: TransactionUpdatePayload // Using the defined interface
): Promise<void> {
  console.log(
    `DataService: Attempting to update transaction ID: ${transactionId} with payload:`,
    payload,
    `Platform: ${currentPlatform}`
  );

  // Basic validation for payload to prevent sending empty updates if not desired
  if (Object.keys(payload).length === 0) {
    console.warn(
      "DataService: updateTransaction called with an empty payload."
    );
    // Depending on desired behavior, you might throw an error or return early
    // For now, let's proceed, as the backend might handle this (e.g., only update updated_at)
  }

  if (currentPlatform === "desktop") {
    try {
      // The Rust handler `update_transaction_handler` expects an object with `id` and `payload` keys.
      await invoke("update_transaction_handler", {
        id: transactionId,
        payload,
      });
      console.log(
        `DataService: Tauri update_transaction_handler successful for ID: ${transactionId}`
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error(
        `DataService: Error invoking update_transaction_handler for ID ${transactionId}:`,
        error
      );
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      // For Supabase, the payload should directly be the object of fields to update.
      // Ensure the payload keys match Supabase column names (snake_case).
      // The `TransactionUpdatePayload` above uses camelCase for JS consistency,
      // so if Supabase expects snake_case, a transformation might be needed here
      // OR ensure the payload sent from the form ALREADY uses snake_case if it's simpler.
      // For now, assuming Supabase client handles or columns are named matching camelCase,
      // or that the payload will be structured with snake_case keys if necessary before calling this.
      // Let's assume for now payload is already in correct format for Supabase (or client handles it)

      // Supabase requires snake_case for column names if your DB is set up that way.
      // The Transaction type itself uses snake_case due to `db_name` in the original type,
      // but TransactionUpdatePayload was defined with JS-style camelCase for frontend forms.
      // We need to convert `payload` to snake_case before sending to Supabase.
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
      // Specifically handle 'type' -> 'type' (if your Supabase column is 'type')
      // or 'type' -> 'transaction_type' if that's the column name.
      // The Transaction type has 'type', let's assume Supabase column is also 'type'.
      // If TransactionUpdatePayload has 'type' and it needs to be 'type_str' for Rust but 'type' for Supabase:
      if (snakeCasePayload.type && !snakeCasePayload.type_str) {
        // This depends on how 'type' is named in TransactionUpdatePayload vs Supabase column.
        // If TransactionUpdatePayload has `type` and Supabase table column is also `type`.
        // If Supabase expects `transaction_type` but payload has `type`, map it here.
        // For now, the conversion above should handle typical camel to snake, e.g. isChomesh -> is_chomesh.
        // 'type' will remain 'type'.
      }
      // Remove 'type_str' if it exists from conversion but Supabase expects 'type'
      // delete snakeCasePayload.type_str; // This is risky if 'type' wasn't in payload.

      console.log(
        "DataService: Supabase update payload (after potential snake_case conversion):",
        snakeCasePayload
      );

      const { data, error } = await supabase
        .from("transactions")
        .update(snakeCasePayload) // Send the converted payload
        .eq("id", transactionId)
        .select(); // Optionally select to get the updated row back

      if (error) {
        console.error(
          `DataService: Error updating transaction ID ${transactionId} in Supabase:`,
          error
        );
        throw error;
      }
      if (!data || data.length === 0) {
        // This might happen if RLS prevents update or row doesn't exist,
        // or if .select() wasn't called or didn't return data.
        // For update, supabase might not return data by default unless .select() is used.
        // And even with .select(), if no rows matched, data could be empty.
        console.warn(
          `DataService: Supabase update for transaction ID ${transactionId} completed, but no data returned or no rows affected. This might be expected if the row didn't exist or RLS prevented the update/select.`
        );
        // We might still want to update the timestamp if the operation didn't error,
        // assuming the backend handled it or it was a 'no-op' on a non-existent row.
        // However, if an update to a non-existent row should be an error, the backend should signal it.
      }
      console.log(
        `DataService: Supabase update successful for transaction ID: ${transactionId}. Data:`,
        data
      );
      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
    } catch (error) {
      console.error(
        `DataService: Error updating transaction ID ${transactionId} in Supabase (catch block):`,
        error
      );
      throw error;
    }
  } else {
    console.warn(
      `DataService: Platform not yet determined. Cannot update transaction ID: ${transactionId}.`
    );
    throw new Error(
      "Cannot update transaction: Platform not initialized or unknown."
    );
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
    // transactions: [], // REMOVE THIS LINE - transactions field no longer exists in the store
    // We might want to clear other relevant parts of the store here if needed,
    // e.g., server-calculated values, but for now, just removing the erroneous line.
    // For a full clear, we might iterate over keys or list them explicitly.
    // Example of clearing other fields if desired:
    // serverCalculatedTitheBalance: null,
    // serverCalculatedTotalIncome: null,
    // serverCalculatedChomeshAmount: null,
    // serverCalculatedTotalExpenses: null,
    // serverCalculatedTotalDonations: null,
    // serverCalculatedDonationsData: null,
    // serverMonthlyChartData: [],
    // currentChartEndDate: null,
    lastDbFetchTimestamp: null, // It's good to clear this as well
  });
  console.log(
    "Zustand store cleared (transactions field removed from this operation)."
  );
}

// --- Server-Side Calculation Functions ---

// Web: Fetch total income and chomesh for a user from Supabase
export async function fetchTotalIncomeForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerIncomeData | null> {
  console.log(
    `DataService (Web): Fetching total income for user ${userId} from ${startDate} to ${endDate}`
  );
  try {
    const { data, error } = await supabase.rpc(
      "get_total_income_and_chomesh_for_user",
      {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
      }
    );

    if (error) {
      console.error("Error fetching total income from Supabase RPC:", error);
      throw error;
    }
    console.log("DataService (Web): Supabase RPC call successful. Data:", data);
    if (
      data &&
      typeof data.total_income === "number" &&
      typeof data.chomesh_amount === "number"
    ) {
      return data as ServerIncomeData;
    } else if (
      data &&
      data.length > 0 &&
      typeof data[0].total_income === "number" &&
      typeof data[0].chomesh_amount === "number"
    ) {
      // Handle cases where Supabase might return an array with one object
      console.warn("Supabase RPC returned an array, taking the first element.");
      return data[0] as ServerIncomeData;
    } else {
      console.warn(
        "DataService (Web): Received unexpected data structure from Supabase RPC or null data:",
        data
      );
      // Ensure we return a structure that matches ServerIncomeData, even if it's zeroed out, or handle as appropriate
      return { total_income: 0, chomesh_amount: 0 };
    }
  } catch (error) {
    console.error("Error in fetchTotalIncomeForUserWeb:", error);
    return null; // Or throw error, depending on how you want to handle this
  }
}

// Web: Fetch total expenses for a user from Supabase
export async function fetchTotalExpensesForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<number | null> {
  console.log(
    `DataService (Web): Fetching total expenses for user ${userId} from ${startDate} to ${endDate}`
  );
  try {
    const { data, error } = await supabase.rpc("get_total_expenses_for_user", {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("Error fetching total expenses from Supabase RPC:", error);
      throw error;
    }
    console.log(
      "DataService (Web): Supabase RPC call for expenses successful. Data:",
      data
    );
    if (typeof data === "number") {
      return data;
    } else {
      console.warn(
        "DataService (Web): Received unexpected data structure from Supabase RPC for expenses or null data:",
        data
      );
      return 0; // Default to 0 if data is not a number
    }
  } catch (error) {
    console.error("Error in fetchTotalExpensesForUserWeb:", error);
    return null;
  }
}

// Desktop: Fetch total income and chomesh in a date range from SQLite
export async function fetchTotalIncomeForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerIncomeData> {
  console.log(
    `DataService (Desktop): Fetching total income from ${startDate} to ${endDate}`
  );
  try {
    const result = await invoke<ServerIncomeData>(
      "get_desktop_total_income_in_range",
      {
        startDate,
        endDate,
      }
    );
    console.log(
      "DataService (Desktop): Tauri invoke successful. Data:",
      result
    );
    return result;
  } catch (error) {
    console.error("Error invoking get_desktop_total_income_in_range:", error);
    // Return a default or error-indicative structure if needed
    return { total_income: 0, chomesh_amount: 0 };
  }
}

// Desktop: Fetch total expenses in a date range from SQLite
export async function fetchTotalExpensesForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<number> {
  console.log(
    `DataService (Desktop): Fetching total expenses from ${startDate} to ${endDate}`
  );
  try {
    const result = await invoke<number>("get_desktop_total_expenses_in_range", {
      startDate,
      endDate,
    });
    console.log(
      "DataService (Desktop): Tauri invoke for expenses successful. Data:",
      result
    );
    return result;
  } catch (error) {
    console.error("Error invoking get_desktop_total_expenses_in_range:", error);
    return 0; // Default to 0 in case of error
  }
}

// Wrapper function to fetch total income based on platform
export async function fetchTotalIncomeInRange(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<ServerIncomeData | null> {
  if (currentPlatform === "web") {
    if (!userId) {
      console.error(
        "DataService (fetchTotalIncomeInRange): User ID is required for web platform."
      );
      // Try to get user ID from Supabase auth as a fallback
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "DataService: No authenticated user found for web operation."
        );
        return null; // Or throw an error
      }
      return fetchTotalIncomeForUserWeb(user.id, startDate, endDate);
    }
    return fetchTotalIncomeForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalIncomeForUserDesktop(startDate, endDate);
  } else {
    console.warn(
      "DataService (fetchTotalIncomeInRange): Platform not determined. Cannot fetch income."
    );
    return null; // Or a default value
  }
}

// Wrapper function to fetch total expenses based on platform
export async function fetchTotalExpensesInRange(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<number | null> {
  if (currentPlatform === "web") {
    if (!userId) {
      console.error(
        "DataService (fetchTotalExpensesInRange): User ID is required for web platform."
      );
      // Try to get user ID from Supabase auth as a fallback
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "DataService: No authenticated user found for web operation (expenses)."
        );
        return null;
      }
      return fetchTotalExpensesForUserWeb(user.id, startDate, endDate);
    }
    return fetchTotalExpensesForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalExpensesForUserDesktop(startDate, endDate);
  } else {
    console.warn(
      "DataService (fetchTotalExpensesInRange): Platform not determined. Cannot fetch expenses."
    );
    return null;
  }
}

// --- DONATIONS FUNCTIONS START HERE ---
// Web: Fetch total donations for a user from Supabase
export async function fetchTotalDonationsForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerDonationData | null> {
  console.log(
    `DataService (Web): Fetching total donations for user ${userId} from ${startDate} to ${endDate}`
  );
  try {
    const { data, error } = await supabase.rpc("get_total_donations_for_user", {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("Error fetching total donations from Supabase RPC:", error);
      throw error; // Or return null based on desired error handling
    }
    console.log(
      "DataService (Web): Supabase RPC call for donations successful. Data:",
      data
    );
    // Supabase RPCs that return TABLE now return an array of objects
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      if (
        typeof result.total_donations_amount === "number" &&
        typeof result.non_tithe_donation_amount === "number"
      ) {
        return result as ServerDonationData;
      }
    } else if (
      data &&
      typeof data.total_donations_amount === "number" &&
      typeof data.non_tithe_donation_amount === "number"
    ) {
      // Fallback for cases where it might directly return an object
      return data as ServerDonationData;
    }
    console.warn(
      "DataService (Web): Received unexpected data structure from Supabase RPC for donations or null/empty data:",
      data
    );
    return { total_donations_amount: 0, non_tithe_donation_amount: 0 }; // Default value
  } catch (error) {
    console.error("Error in fetchTotalDonationsForUserWeb:", error);
    return null; // Or throw error
  }
}

// Desktop: Fetch total donations in a date range from SQLite
export async function fetchTotalDonationsForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerDonationData | null> {
  // Changed return type to Promise<ServerDonationData | null> for consistency
  console.log(
    `DataService (Desktop): Fetching total donations from ${startDate} to ${endDate}`
  );
  try {
    // TODO: Update Tauri command "get_desktop_total_donations_in_range"
    // to return ServerDonationData structure
    const result = await invoke<{
      total_donations_amount: number;
      non_tithe_donation_amount: number;
    }>("get_desktop_total_donations_in_range", {
      startDate,
      endDate,
    });
    console.log(
      "DataService (Desktop): Tauri invoke for donations successful. Data:",
      result
    );
    if (
      result &&
      typeof result.total_donations_amount === "number" &&
      typeof result.non_tithe_donation_amount === "number"
    ) {
      return result;
    }
    console.warn(
      "DataService (Desktop): Tauri command did not return expected ServerDonationData structure. Data:",
      result
    );
    return { total_donations_amount: 0, non_tithe_donation_amount: 0 }; // Default structure
  } catch (error) {
    console.error(
      "Error invoking get_desktop_total_donations_in_range:",
      error
    );
    return null; // Return null in case of error, similar to web version
  }
}

// Wrapper function to fetch total donations based on platform
export async function fetchTotalDonationsInRange(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<ServerDonationData | null> {
  if (currentPlatform === "web") {
    if (!userId) {
      console.error(
        "DataService (fetchTotalDonationsInRange): User ID is required for web platform."
      );
      // Attempt to get user ID from Supabase auth as a fallback
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "DataService: No authenticated user found for web operation (donations)."
        );
        return null;
      }
      userId = user.id; // Assign fetched userId
    }
    return fetchTotalDonationsForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalDonationsForUserDesktop(startDate, endDate);
  } else {
    console.warn(
      "DataService (fetchTotalDonationsInRange): Platform not determined. Cannot fetch donations."
    );
    return null;
  }
}
// --- DONATIONS FUNCTIONS END HERE ---

// --- SERVER TITHE BALANCE FUNCTIONS START HERE ---
// Web: Fetch overall tithe balance for a user from Supabase
export async function fetchServerTitheBalanceWeb(
  userId: string
): Promise<number | null> {
  console.log(
    `DataService (Web): Fetching overall tithe balance for user ${userId}`
  );
  try {
    const { data, error } = await supabase.rpc("calculate_user_tithe_balance", {
      p_user_id: userId,
    });

    if (error) {
      console.error(
        "Error fetching overall tithe balance from Supabase RPC:",
        error
      );
      throw error;
    }
    console.log(
      "DataService (Web): Supabase RPC call for overall tithe balance successful. Data:",
      data
    );
    if (typeof data === "number") {
      return data;
    } else {
      console.warn(
        "DataService (Web): Received unexpected data structure from Supabase RPC for overall tithe balance or null data:",
        data
      );
      return 0; // Or handle as appropriate
    }
  } catch (error) {
    console.error("Error in fetchServerTitheBalanceWeb:", error);
    return null;
  }
}

// Desktop: Fetch overall tithe balance from SQLite
export async function fetchServerTitheBalanceDesktop(): Promise<number | null> {
  console.log(`DataService (Desktop): Fetching overall tithe balance`);
  try {
    const result = await invoke<number>("get_desktop_overall_tithe_balance");
    console.log(
      "DataService (Desktop): Tauri invoke for overall tithe balance successful. Data:",
      result
    );
    return result;
  } catch (error) {
    console.error("Error invoking get_desktop_overall_tithe_balance:", error);
    return null;
  }
}

// Wrapper function to fetch overall tithe balance based on platform
export async function fetchServerTitheBalance(
  userId: string | null // userId is only needed for web
): Promise<number | null> {
  if (currentPlatform === "web") {
    if (!userId) {
      console.error(
        "DataService (fetchServerTitheBalance): User ID is required for web platform."
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "DataService: No authenticated user found for web operation (tithe balance)."
        );
        return null;
      }
      userId = user.id;
    }
    return fetchServerTitheBalanceWeb(userId);
  } else if (currentPlatform === "desktop") {
    return fetchServerTitheBalanceDesktop();
  } else {
    console.warn(
      "DataService (fetchServerTitheBalance): Platform not determined. Cannot fetch overall tithe balance."
    );
    return null;
  }
}
// --- SERVER TITHE BALANCE FUNCTIONS END HERE ---
