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
          // Assuming rpcData is the single object if not an array or null
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
          // Ensure a valid structure for return, even if it's empty
          if (responseData && typeof responseData.total_count === "number") {
            // This means the structure is { transactions: null or [], total_count: number } which is fine.
          } else {
            // Fallback to a definite empty structure if still problematic
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
      const { data, error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (!data) throw new Error("No data returned after update");
      return data as Transaction;
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
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    } else if (platform === "desktop") {
      console.warn("Desktop deleteTransaction not implemented yet.");
      throw new Error("Desktop delete not implemented.");
    } else {
      throw new Error("Platform not supported for deleteTransaction");
    }
  }
}
