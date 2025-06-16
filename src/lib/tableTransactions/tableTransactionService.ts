// import { invoke } from "@tauri-apps/api/core"; // STATIC IMPORT REMOVED
import { supabase } from "../supabaseClient"; // Updated path
import { Transaction } from "../../types/transaction"; // Updated path
import { Platform } from "../../contexts/PlatformContext"; // Updated path
import { TableTransactionFilters } from "./tableTransactions.types"; // Updated path
import {
  updateTransaction as updateTransactionInDataService,
  deleteTransaction as deleteTransactionInDataService,
  TransactionUpdatePayload, // Assuming TransactionUpdatePayload is exported from dataService or a shared types file
} from "../data-layer"; // Adjusted path to dataService

interface FetchTransactionsParams {
  offset: number;
  limit: number;
  filters: TableTransactionFilters;
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
  totalCount: number;
}

interface GetFilteredTransactionsArgsPayload {
  filters: {
    search: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    types: string[] | null;
    showOnly: string | null;
    recurringStatuses: string[] | null;
    recurringFrequencies: string[] | null;
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
  dateFrom: string | null;
  dateTo: string | null;
  types: string[] | null;
  showOnly: string | null;
  recurringStatuses: string[] | null;
  recurringFrequencies: string[] | null;
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
          p_is_recurring:
            filters.isRecurring === "all"
              ? null
              : filters.isRecurring === "recurring",
          p_recurring_statuses:
            filters.recurringStatuses.length > 0
              ? filters.recurringStatuses
              : null,
          p_recurring_frequencies:
            filters.recurringFrequencies.length > 0
              ? filters.recurringFrequencies
              : null,
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
        const { invoke } = await import("@tauri-apps/api/core");
        const payload: GetFilteredTransactionsArgsPayload = {
          filters: {
            search: filters.search || null,
            dateFrom: filters.dateRange.from
              ? new Date(filters.dateRange.from).toISOString().split("T")[0]
              : null,
            dateTo: filters.dateRange.to
              ? new Date(filters.dateRange.to).toISOString().split("T")[0]
              : null,
            types: filters.types.length > 0 ? filters.types : null,
            showOnly:
              filters.isRecurring === "all" ? null : filters.isRecurring,
            recurringStatuses:
              filters.recurringStatuses.length > 0
                ? filters.recurringStatuses
                : null,
            recurringFrequencies:
              filters.recurringFrequencies.length > 0
                ? filters.recurringFrequencies
                : null,
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
          totalCount: Number(response.totalCount),
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
  ): Promise<void> {
    console.log(
      `TableTransactionsService: updateTransaction for ID ${id} - delegating to dataService. Platform awareness is in dataService.`
    );
    try {
      await updateTransactionInDataService(
        id,
        updates as TransactionUpdatePayload
      );
      console.log(
        `TableTransactionsService: dataService.updateTransaction call for ID: ${id} presumed successful.`
      );
    } catch (error) {
      console.error(
        `TableTransactionsService: Error calling dataService.updateTransaction for ID ${id}:`,
        error
      );
      throw new Error(
        `Failed to update transaction via dataService: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  static async deleteTransaction(
    id: string,
    platform: Platform
  ): Promise<void> {
    console.log(
      `TableTransactionsService: deleteTransaction for ID ${id} - delegating to dataService. Platform awareness is in dataService.`
    );
    try {
      await deleteTransactionInDataService(id);
      console.log(
        `TableTransactionsService: dataService.deleteTransaction call for ID: ${id} presumed successful.`
      );
    } catch (error) {
      console.error(
        `TableTransactionsService: Error calling dataService.deleteTransaction for ID ${id}:`,
        error
      );
      throw new Error(
        `Failed to delete transaction via dataService: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  static async getDataForExport(
    filters: TableTransactionFilters,
    platform: Platform
  ): Promise<{ transactions: Transaction[]; totalCount: number }> {
    console.log("Preparing data for export with filters:", filters);

    // To get the total count and all transactions, we call the same
    // fetching logic as the main table, but with a very high limit to get all records.
    // We can use the existing fetchTransactions method for this.
    // The sorting doesn't matter for the export file itself, but we'll use the default.
    const response = await this.fetchTransactions({
      offset: 0,
      limit: 10000, // A high limit to fetch all records for export
      filters,
      sorting: { field: "date", direction: "desc" },
      platform,
    });

    console.log(
      `Got ${response.data.length} transactions for export with a total count of ${response.totalCount}`
    );

    return {
      transactions: response.data,
      totalCount: response.totalCount,
    };
  }
}
