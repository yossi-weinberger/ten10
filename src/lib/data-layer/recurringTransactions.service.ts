import { supabase } from "@/lib/supabaseClient";
import { RecurringTransaction } from "@/types/transaction";
import { getPlatform } from "../platformManager";
import { useDonationStore } from "../store";
import { nanoid } from "nanoid";

// Type for creating a new recurring transaction, omitting fields generated by the DB
// For desktop, we will generate the ID on the client.
export type NewRecurringTransaction = Omit<
  RecurringTransaction,
  "id" | "user_id" | "created_at" | "updated_at" | "execution_count" | "status"
>;

/**
 * Creates a new recurring transaction definition in the database.
 * @param definition - The recurring transaction details.
 * @returns The created recurring transaction data.
 */
export async function createRecurringTransaction(
  definition: NewRecurringTransaction
): Promise<RecurringTransaction> {
  const platform = getPlatform();

  if (platform === "web") {
    // --- WEB (SUPABASE) LOGIC ---
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error getting user:", userError);
      throw new Error("User not found");
    }

    const { data, error } = await supabase
      .from("recurring_transactions")
      .insert([
        {
          ...definition,
          user_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating recurring transaction on Supabase:", error);
      throw error;
    }
    return data;
  } else if (platform === "desktop") {
    // --- DESKTOP (TAURI) LOGIC ---
    const { invoke } = await import("@tauri-apps/api/core");

    const newRecurringTransaction: RecurringTransaction = {
      ...definition,
      id: nanoid(), // Generate client-side ID for desktop
      user_id: null, // No user concept on desktop
      status: "active",
      execution_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await invoke("add_recurring_transaction_handler", {
        recTransaction: newRecurringTransaction,
      });
      return newRecurringTransaction; // Return the object we just created
    } catch (error) {
      console.error("Error creating recurring transaction on Desktop:", error);
      throw new Error(
        "Failed to save recurring transaction to desktop database."
      );
    }
  } else {
    throw new Error("Unsupported platform");
  }
}

/**
 * Fetches all recurring transactions for the currently authenticated user.
 * @returns An array of recurring transactions.
 */
export async function getRecurringTransactions(): Promise<
  RecurringTransaction[]
> {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*");

  if (error) {
    console.error("Error fetching recurring transactions:", error);
    throw error;
  }

  return data || [];
}
