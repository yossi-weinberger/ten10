import { invoke } from "@tauri-apps/api";
import { supabase } from "@/lib/supabaseClient";
import { Transaction } from "../types/transaction";
import { getCurrentPlatform } from "./platformService";
import { Platform } from "@/contexts/PlatformContext";
import {
  TableTransactionFilters,
  TableSortConfig,
} from "../types/tableTransactions.types";

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

interface FetchTransactionsParams {
  offset: number;
  limit: number;
  filters: {
    search: string | null;
    dateRange: {
      from: string | null;
      to: string | null;
    };
    types: string[];
  };
  sorting: {
    field: string;
    direction: string;
  };
  platform: Platform;
}

interface FetchTransactionsResponse {
  data: Transaction[];
  totalCount: number;
}

interface PaginatedTransactionsResponseFromRust {
  transactions: Transaction[];
  total_count: number;
}

interface GetFilteredTransactionsArgsPayload {
  filters: {
    search: string | null;
    date_from: string | null;
    date_to: string | null;
    types: string[] | null;
  };
  pagination: {
    page: number;
    limit: number;
  };
  sorting: {
    field: string;
    direction: string;
  };
}

interface ExportTransactionsFiltersPayload {
  search: string | null;
  date_from: string | null;
  date_to: string | null;
  types: string[] | null;
}

export class TableTransactionsService {
  static async fetchTransactions(
    params: FetchTransactionsParams
  ): Promise<FetchTransactionsResponse> {
    const { offset, limit, filters, sorting, platform } = params;

    console.log(
      "TableTransactionsService: Fetching transactions. Platform:",
      platform,
      "Params:",
      params
    );

    if (platform === "web") {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated for fetching transactions.");
        }

        const rpcParams = {
          p_user_id: user.id,
          p_offset: offset,
          p_limit: limit,
          p_date_from: filters.dateRange.from
            ? new Date(filters.dateRange.from).toISOString().split("T")[0]
            : null,
          p_date_to: filters.dateRange.to
            ? new Date(filters.dateRange.to).toISOString().split("T")[0]
            : null,
          p_types: filters.types.length > 0 ? filters.types : null,
          p_search: filters.search || null,
          p_sort_field: sorting.field as string,
          p_sort_direction: sorting.direction,
        };

        console.log(
          "TableTransactionsService: Calling RPC 'get_user_transactions' with params:",
          JSON.stringify(rpcParams, null, 2)
        );

        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_user_transactions",
          rpcParams
        );

        if (rpcError) {
          console.error("Supabase RPC get_user_transactions error:", rpcError);
          throw rpcError;
        }

        let responseData: {
          transactions: Transaction[];
          total_count: number;
        } | null = null;

        // The RPC get_user_transactions is expected to return a single row where
        // the first column is the JSON array of transactions and the second is the total count.
        // However, Supabase RPC calls might wrap this in an array if SETOF is used in a specific way.
        // We need to handle both cases: direct object or object within an array.
        if (Array.isArray(rpcData)) {
          if (rpcData.length > 0) {
            // Assuming the actual data is in the first element if it's an array
            responseData = rpcData[0] as {
              transactions: Transaction[];
              total_count: number;
            };
          } else {
            // Empty array from RPC, treat as no results
            responseData = { transactions: [], total_count: 0 };
          }
        } else if (rpcData) {
          // Direct object from RPC
          responseData = rpcData as {
            transactions: Transaction[];
            total_count: number;
          };
        } else {
          // Null or undefined from RPC, treat as no results
          responseData = { transactions: [], total_count: 0 };
        }

        const transactions: Transaction[] = responseData.transactions || [];
        const totalCount: number = responseData.total_count || 0;

        console.log(
          `TableTransactionsService: Parsed transactions count: ${transactions.length}, Parsed total server count: ${totalCount}.`
        );
        return { data: transactions, totalCount };
      } catch (error) {
        console.error(
          "Error in TableTransactionsService.fetchTransactions (Supabase):",
          error
        );
        throw error;
      }
    } else if (platform === "desktop") {
      // Desktop implementation
      try {
        const payload: GetFilteredTransactionsArgsPayload = {
          filters: {
            search: filters.search || null,
            date_from: filters.dateRange.from
              ? new Date(filters.dateRange.from).toISOString().split("T")[0]
              : null,
            date_to: filters.dateRange.to
              ? new Date(filters.dateRange.to).toISOString().split("T")[0]
              : null,
            types: filters.types.length > 0 ? filters.types : null,
          },
          pagination: {
            page: offset / limit + 1, // Calculate page number for Rust
            limit: limit,
          },
          sorting: {
            field: sorting.field as string,
            direction: sorting.direction,
          },
        };
        console.log(
          "TableTransactionsService: Invoking get_filtered_transactions_handler with payload:",
          JSON.stringify(payload)
        );
        const response = await invoke<PaginatedTransactionsResponseFromRust>(
          "get_filtered_transactions_handler",
          { args: payload }
        );
        console.log(
          "TableTransactionsService: Response from desktop (get_filtered_transactions_handler):",
          response
        );
        return {
          data: response.transactions,
          totalCount: Number(response.total_count),
        };
      } catch (error) {
        console.error(
          "Error in TableTransactionsService.fetchTransactions (Desktop):",
          error
        );
        throw error;
      }
    } else {
      console.log(
        "TableTransactionsService: Platform not yet determined (should be web or desktop), returning empty transactions."
      );
      return { data: [], totalCount: 0 };
    }
  }

  static async updateTransaction(
    id: string,
    updates: Partial<Transaction>,
    platform: Platform
  ): Promise<Transaction> {
    console.log(
      `TableTransactionsService: Updating transaction ${id}. Platform: ${platform}`
    );
    if (platform === "web") {
      // ... existing code ...
    } else if (platform === "desktop") {
      console.log(
        `TableTransactionsService: Invoking update_transaction_handler for ID: ${id} with updates:`,
        updates
      );
      try {
        // Assuming a Rust command `update_transaction_handler` will be created.
        // It would likely take { transactionId: string, updates: Partial<Transaction> }
        // For now, we are just passing updates. The Rust side needs to handle this structure.
        // Also, the Rust side will need to return the updated transaction.
        const updatedTransaction = await invoke<Transaction>(
          "update_transaction_handler", // This command needs to be created in Rust
          { transactionId: id, updates: updates }
        );
        console.log(
          "TableTransactionsService: Desktop update_transaction_handler successful.",
          updatedTransaction
        );
        return updatedTransaction;
      } catch (error) {
        console.error("Error invoking update_transaction_handler:", error);
        // It's important that the Rust command `update_transaction_handler` exists and is registered.
        throw new Error(
          `Failed to update transaction on desktop: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    throw new Error("Platform not supported for updateTransaction");
  }

  static async deleteTransaction(
    id: string,
    platform: Platform
  ): Promise<void> {
    console.log(
      `TableTransactionsService: Deleting transaction ${id}. Platform: ${platform}`
    );
    if (platform === "web") {
      // ... existing code ...
    } else if (platform === "desktop") {
      try {
        console.log(
          `TableTransactionsService: Invoking delete_transaction_handler for ID: ${id}`
        );
        await invoke("delete_transaction_handler", { transactionId: id });
        console.log(
          "TableTransactionsService: Desktop delete_transaction_handler successful."
        );
        return; // No specific data returned on success
      } catch (error) {
        console.error("Error invoking delete_transaction_handler:", error);
        throw new Error(
          `Failed to delete transaction on desktop: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    throw new Error("Platform not supported for deleteTransaction");
  }

  static async getTransactionsForExport(
    filters: TableTransactionFilters,
    platform: Platform
  ): Promise<Transaction[]> {
    console.log(
      `TableTransactionsService: Getting transactions for export. Platform: ${platform}`
    );
    if (platform === "web") {
      // ... existing code ...
    } else if (platform === "desktop") {
      try {
        const payload: ExportTransactionsFiltersPayload = {
          search: filters.search || null,
          date_from: filters.dateRange.from
            ? new Date(filters.dateRange.from).toISOString().split("T")[0]
            : null,
          date_to: filters.dateRange.to
            ? new Date(filters.dateRange.to).toISOString().split("T")[0]
            : null,
          types: filters.types.length > 0 ? filters.types : null,
        };
        console.log(
          "TableTransactionsService: Invoking export_transactions_handler with payload:",
          JSON.stringify(payload)
        );
        const transactions = await invoke<Transaction[]>(
          "export_transactions_handler",
          { filters: payload } // The Rust command expects 'filters' as the argument name
        );
        console.log(
          "TableTransactionsService: Desktop export_transactions_handler successful, transactions count:",
          transactions.length
        );
        return transactions;
      } catch (error) {
        console.error("Error invoking export_transactions_handler:", error);
        throw new Error(
          `Failed to export transactions from desktop: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
    throw new Error("Platform not supported for getTransactionsForExport");
  }
}
