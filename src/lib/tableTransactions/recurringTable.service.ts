import { supabase } from "@/lib/supabaseClient";
import { RecurringTransaction } from "@/types/transaction";
import { getPlatform } from "@/lib/platformManager";
import {
  RecurringTableSortConfig,
  RecurringTableFilters,
} from "./recurringTable.store";
import { logger } from "@/lib/logger";

export async function fetchAllRecurring(
  sorting: RecurringTableSortConfig,
  filters: RecurringTableFilters
): Promise<RecurringTransaction[]> {
  const platform = getPlatform();
  if (platform === "web") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      logger.error("User not found for fetching recurring transactions");
      return [];
    }
    const rpcParams = {
      p_user_id: user.id,
      p_sort_field: sorting.field,
      p_sort_direction: sorting.direction,
      p_search_text: filters.search || null,
      p_statuses: filters.statuses.length > 0 ? filters.statuses : null,
    };
    const { data, error } = await supabase.rpc(
      "get_user_recurring_transactions",
      rpcParams
    );
    if (error) {
      logger.error("Error fetching recurring transactions via RPC:", error);
      throw error;
    }
    return data || [];
  } else if (platform === "desktop") {
    const { invoke } = await import("@tauri-apps/api/core");
    const payload = {
      sorting: {
        field: sorting.field,
        direction: sorting.direction,
      },
      filters: {
        search: filters.search || null,
        statuses: filters.statuses.length > 0 ? filters.statuses : null,
      },
    };
    return await invoke("get_recurring_transactions_handler", {
      args: payload,
    });
  }
  return [];
}

export async function updateRecurringTransaction(
  id: string,
  values: Partial<RecurringTransaction>
): Promise<RecurringTransaction> {
  const platform = getPlatform();

  if (platform === "web") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated for updating transaction");
    }

    // Map the form values to the expected RPC parameter names
    const rpcParams = {
      p_id: id,
      p_user_id: user.id,
      p_amount: values.amount,
      p_currency: values.currency,
      p_description: values.description,
      p_status: values.status,
      p_total_occurrences: values.total_occurrences,
      p_day_of_month: values.day_of_month,
    };

    const { data, error } = await supabase
      .rpc("update_recurring_transaction", rpcParams)
      .select()
      .single();

    if (error) {
      logger.error("Error updating recurring transaction via RPC:", error);
      throw error;
    }
    return data;
  } else if (platform === "desktop") {
    const { invoke } = await import("@tauri-apps/api/core");
    const updatedTransaction = await invoke(
      "update_recurring_transaction_handler",
      {
        id,
        updates: values,
      }
    );
    return updatedTransaction as RecurringTransaction;
  }
  throw new Error("Unsupported platform");
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const platform = getPlatform();

  if (platform === "web") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated for deleting transaction");
    }
    const { error } = await supabase.rpc("delete_recurring_transaction", {
      p_id: id,
      p_user_id: user.id,
    });

    if (error) {
      logger.error("Error deleting recurring transaction via RPC:", error);
      throw error;
    }
  } else if (platform === "desktop") {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("delete_recurring_transaction_handler", { id });
  } else {
    throw new Error("Unsupported platform");
  }
}
