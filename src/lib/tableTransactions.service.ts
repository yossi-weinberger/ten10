import { supabase } from "@/lib/supabaseClient";
import { Transaction } from "../types/transaction";
import {
  TableTransactionFilters,
  TableSortConfig,
} from "../types/tableTransactions.types";
import { Platform } from "@/contexts/PlatformContext"; // Import Platform type
// import { invoke } from "@tauri-apps/api"; // Uncomment when desktop implementation is added

interface FetchTransactionsParams {
  offset: number;
  limit: number;
  filters: TableTransactionFilters;
  sorting: TableSortConfig;
  platform: Platform; // Add platform to params
}

interface FetchTransactionsResponse {
  data: Transaction[];
  totalCount: number;
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
            ? filters.dateRange.from.toISOString().split("T")[0]
            : null,
          p_date_to: filters.dateRange.to
            ? filters.dateRange.to.toISOString().split("T")[0]
            : null,
          p_types: filters.types.length > 0 ? filters.types : null,
          p_search: filters.search || null,
          p_sort_field: sorting.field as string,
          p_sort_direction: sorting.direction,
        };

        console.log(
          "TableTransactionsService: Calling RPC with params:",
          JSON.stringify(rpcParams, null, 2)
        );

        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_user_transactions",
          rpcParams
        );

        console.log(
          "TableTransactionsService: Raw rpcData:",
          JSON.stringify(rpcData, null, 2)
        );
        console.log(
          "TableTransactionsService: Raw rpcError:",
          JSON.stringify(rpcError, null, 2)
        );

        if (rpcError) {
          console.error("Supabase RPC get_user_transactions error:", rpcError);
          throw rpcError;
        }

        let singleRowData: {
          transactions: Transaction[];
          total_count: number;
        } | null = null;

        if (Array.isArray(rpcData)) {
          if (rpcData.length > 0) {
            singleRowData = rpcData[0] as {
              transactions: Transaction[];
              total_count: number;
            };
            console.log(
              "TableTransactionsService: RPC returned an array, taking first element:",
              singleRowData
            );
          } else {
            console.log(
              "TableTransactionsService: RPC returned an empty array, treating as 0 results."
            );
            singleRowData = { transactions: [], total_count: 0 };
          }
        } else if (rpcData === null) {
          console.log(
            "TableTransactionsService: RPC returned null, treating as 0 results."
          );
          singleRowData = { transactions: [], total_count: 0 };
        } else {
          singleRowData = rpcData as {
            transactions: Transaction[];
            total_count: number;
          };
        }

        const responseData = singleRowData;

        if (!responseData || typeof responseData.total_count !== "number") {
          console.error(
            "Supabase RPC get_user_transactions unexpected response structure after potential array handling:",
            responseData,
            "Original rpcData:",
            rpcData
          );
          if (responseData && typeof responseData.total_count === "number") {
          } else {
            console.error(
              "Fallback: Returning empty due to persistent unexpected structure."
            );
            return { data: [], totalCount: 0 };
          }
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
      console.warn(
        "TableTransactionsService: Desktop fetch not yet implemented. Returning empty data."
      );
      return { data: [], totalCount: 0 };
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated for updating transaction.");
      }

      // Ensure 'id', 'user_id', 'created_at', 'updated_at' are not in the updates payload
      // as they are handled by the RPC or should not be changed by user directly.
      // The RPC function 'update_user_transaction' has an allowed_columns list.
      const {
        id: transactionIdInput, // Avoid passing 'id' from updates to RPC p_updates
        user_id: userIdInput, // Avoid passing 'user_id' from updates
        created_at: createdAtInput,
        updated_at: updatedAtInput,
        ...validUpdatesPayload
      } = updates;

      const { data, error: rpcError } = await supabase.rpc(
        "update_user_transaction",
        {
          p_transaction_id: id,
          p_user_id: user.id,
          p_updates: validUpdatesPayload,
        }
      );

      if (rpcError) {
        console.error(
          `Supabase RPC update_user_transaction error for transaction ${id}:`,
          rpcError
        );
        throw rpcError;
      }

      // RPC returns SETOF transactions, data will be an array with the updated row.
      if (!data || !Array.isArray(data) || data.length === 0) {
        // This case might happen if the RPC's "IF NOT FOUND THEN RAISE EXCEPTION" was commented out
        // and no row was actually updated (e.g., wrong user_id or transaction_id).
        // Or if the RPC had an issue but didn't throw a PostgREST error.
        console.error(
          `No data returned or empty array from RPC update_user_transaction for transaction ${id}. Original RPC data:`,
          data
        );
        throw new Error(
          `Failed to update transaction ${id} or no data returned.`
        );
      }
      return data[0] as Transaction; // Return the first (and only) updated row
    } else if (platform === "desktop") {
      console.warn("Desktop updateTransaction not implemented yet.");
      throw new Error("Desktop update not implemented.");
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated for deleting transaction.");
      }

      const { error: rpcError } = await supabase.rpc(
        "delete_user_transaction",
        {
          p_transaction_id: id,
          p_user_id: user.id,
        }
      );

      if (rpcError) {
        console.error(
          `Supabase RPC delete_user_transaction error for transaction ${id}:`,
          rpcError
        );
        throw rpcError;
      }
      console.log(`Transaction ${id} delete initiated successfully via RPC.`);
    } else if (platform === "desktop") {
      console.warn("Desktop deleteTransaction not implemented yet.");
      throw new Error("Desktop delete not implemented.");
    } else {
      throw new Error("Platform not supported for deleteTransaction");
    }
  }
}
