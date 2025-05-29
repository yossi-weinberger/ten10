import { invoke } from "@tauri-apps/api";
import { supabase } from "../supabaseClient"; // Updated path
import { Transaction } from "../../types/transaction"; // Updated path
import { Platform } from "../../contexts/PlatformContext"; // Updated path
import { TableTransactionFilters } from "./tableTransactions.types"; // Updated path

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
    if (platform === "desktop") {
      console.log(
        `TableTransactionsService: Invoking update_transaction_handler for ID: ${id} with updates:`,
        updates
      );
      try {
        await invoke("update_transaction_handler", {
          id: id,
          payload: updates,
        });
        console.log(
          `TableTransactionsService: Desktop update_transaction_handler call for ID: ${id} presumably successful.`
        );
        return { id, ...updates } as Transaction;
      } catch (error) {
        console.error("Error invoking update_transaction_handler:", error);
        throw new Error(
          `Failed to update transaction on desktop: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else if (platform === "web") {
      try {
        const { data, error } = await supabase
          .from("transactions")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error(
            `TableTransactionsService: Supabase update error for ID ${id}:`,
            error
          );
          throw error;
        }
        if (!data) {
          throw new Error(`Supabase update for ID ${id} did not return data.`);
        }
        console.log(
          `TableTransactionsService: Supabase update successful for ID: ${id}`
        );
        return data as Transaction;
      } catch (error) {
        console.error(`Error updating transaction ${id} in Supabase:`, error);
        throw error;
      }
    } else {
      console.error(
        `TableTransactionsService: Platform ${platform} not supported for updateTransaction.`
      );
      throw new Error(
        `Platform ${platform} not supported for updateTransaction.`
      );
    }
  }

  static async deleteTransaction(
    id: string,
    platform: Platform
  ): Promise<void> {
    console.log(
      `TableTransactionsService: Deleting transaction ${id}. Platform: ${platform}`
    );
    if (platform === "desktop") {
      try {
        console.log(
          `TableTransactionsService: Invoking delete_transaction_handler for ID: ${id}`
        );
        await invoke("delete_transaction_handler", { transactionId: id });
        console.log(
          "TableTransactionsService: Desktop delete_transaction_handler successful."
        );
      } catch (error) {
        console.error("Error invoking delete_transaction_handler:", error);
        throw new Error(
          `Failed to delete transaction on desktop: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else if (platform === "web") {
      try {
        const { error } = await supabase
          .from("transactions")
          .delete()
          .eq("id", id);

        if (error) {
          console.error(
            `TableTransactionsService: Supabase delete error for ID ${id}:`,
            error
          );
          throw error;
        }
        console.log(
          `TableTransactionsService: Supabase delete successful for ID: ${id}`
        );
      } catch (error) {
        console.error(`Error deleting transaction ${id} from Supabase:`, error);
        throw error;
      }
    } else {
      console.error(
        `TableTransactionsService: Platform ${platform} not supported for deleteTransaction.`
      );
      throw new Error(
        `Platform ${platform} not supported for deleteTransaction.`
      );
    }
  }

  static async getTransactionsForExport(
    filters: TableTransactionFilters,
    platform: Platform
  ): Promise<Transaction[]> {
    console.log(
      `TableTransactionsService: Getting transactions for export. Platform: ${platform}`
    );
    if (platform === "web") {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated for exporting transactions.");
        }

        const rpcParams = {
          p_user_id: user.id,
          p_offset: 0, // Fetch all records starting from the beginning
          p_limit: 1000000, // A large limit to fetch all/most records
          p_date_from: filters.dateRange.from
            ? new Date(filters.dateRange.from).toISOString().split("T")[0]
            : null,
          p_date_to: filters.dateRange.to
            ? new Date(filters.dateRange.to).toISOString().split("T")[0]
            : null,
          p_types: filters.types.length > 0 ? filters.types : null,
          p_search: filters.search || null,
          p_sort_field: "date", // Default sort for export consistency
          p_sort_direction: "desc", // Default sort for export consistency
        };

        console.log(
          "TableTransactionsService: Calling RPC 'get_user_transactions' for export with params:",
          JSON.stringify(rpcParams, null, 2)
        );

        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_user_transactions",
          rpcParams
        );

        if (rpcError) {
          console.error(
            "Supabase RPC get_user_transactions for export error:",
            rpcError
          );
          throw rpcError;
        }

        let responseData: {
          transactions: Transaction[];
          total_count: number; // total_count is part of the RPC response but less relevant for full export
        } | null = null;

        if (Array.isArray(rpcData)) {
          if (rpcData.length > 0) {
            responseData = rpcData[0] as {
              transactions: Transaction[];
              total_count: number;
            };
          } else {
            responseData = { transactions: [], total_count: 0 };
          }
        } else if (rpcData) {
          responseData = rpcData as {
            transactions: Transaction[];
            total_count: number;
          };
        } else {
          responseData = { transactions: [], total_count: 0 };
        }

        const transactions: Transaction[] = responseData.transactions || [];
        console.log(
          `TableTransactionsService: Supabase export successful, fetched ${transactions.length} transactions.`
        );
        return transactions;
      } catch (error) {
        console.error(
          "Error in TableTransactionsService.getTransactionsForExport (Supabase):",
          error
        );
        throw error;
      }
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
