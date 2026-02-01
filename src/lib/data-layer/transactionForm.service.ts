// This service is dedicated to handling the logic from the TransactionForm
import { getPlatform } from "../platformManager";
import { TransactionFormValues } from "@/types/forms";
import {
  Transaction,
  RecurringTransaction,
  TransactionType,
} from "@/types/transaction";
import { nanoid } from "nanoid";
import { addTransaction } from "./transactions.service";
import {
  createRecurringTransaction,
  NewRecurringTransaction,
} from "./recurringTransactions.service";
import { clearCategoryCacheForType } from "./categories.service";
import { logger } from "@/lib/logger";

import { useDonationStore } from "@/lib/store";

/**
 * Normalizes a transaction type to its base type.
 * Converts derived types (exempt-income, recognized-expense, non_tithe_donation)
 * back to their base types (income, expense, donation).
 * @param type - The transaction type to normalize.
 * @returns The base transaction type.
 */
export function normalizeToBaseType(type: TransactionType): TransactionType {
  if (type === "exempt-income") return "income";
  if (type === "recognized-expense") return "expense";
  if (type === "non_tithe_donation") return "donation";
  return type;
}

/**
 * Determines the final transaction type based on form values,
 * especially the state of specific checkboxes.
 * This function handles both creating new transactions and editing existing ones,
 * including cases where the transaction already has a derived type.
 * @param values - The data from the transaction form.
 * @returns The specific TransactionType.
 */
export function determineFinalType(
  values: TransactionFormValues
): TransactionType {
  const { type, isExempt, isRecognized, isFromPersonalFunds } = values;

  // Normalize the type to base type first (handles editing existing derived types)
  const baseType = normalizeToBaseType(type);

  // Apply checkbox logic based on base type
  if (baseType === "income" && isExempt) {
    return "exempt-income";
  }
  if (baseType === "expense" && isRecognized) {
    return "recognized-expense";
  }
  if (baseType === "donation" && isFromPersonalFunds) {
    return "non_tithe_donation";
  }

  // If none of the special conditions are met, return the base type.
  return baseType;
}

/**
 * Handles the logic for submitting a transaction form.
 * It determines whether to create a standard or recurring transaction
 * and calls the appropriate service based on the platform.
 * @param values - The data from the transaction form.
 */
export async function handleTransactionSubmit(
  values: TransactionFormValues
): Promise<void> {
  logger.log("handleTransactionSubmit received values:", values);
  const platform = getPlatform();
  const finalType = determineFinalType(values);
  const defaultCurrency = useDonationStore.getState().settings.defaultCurrency;

  // For recurring transactions, the day of the month is derived from the start date,
  // unless explicitly provided by the user (e.g. they want charge on 15th but start on 10th).
  // We prioritize the user input recurring_day_of_month when provided (non-null/undefined).
  // Using getUTCDate to avoid timezone-related off-by-one errors when deriving from date.
  const derivedDayOfMonth = new Date(values.date).getUTCDate();
  const dayOfMonth = values.recurring_day_of_month ?? derivedDayOfMonth;

  // Logic for recurring transactions
  if (values.is_recurring) {
    const definition: NewRecurringTransaction = {
      start_date: values.date,
      next_due_date: values.date,
      frequency: values.frequency || "monthly",
      day_of_month: dayOfMonth,
      total_occurrences: values.recurringTotalCount,
      amount: values.amount,
      currency: values.currency as RecurringTransaction["currency"],
      description: values.description ?? undefined,
      type: finalType,
      category: values.category ?? undefined,
      is_chomesh: values.is_chomesh ?? undefined,
      recipient: values.recipient ?? undefined,
      // Pass conversion details if present (only for manual rate usually, but can pass auto too if we want to snapshot it)
      // The backend/DB now supports these fields.
      original_amount: values.original_amount ?? undefined,
      original_currency: values.original_currency ?? undefined,
      conversion_rate: values.conversion_rate ?? undefined,
      conversion_date: values.conversion_date ?? undefined,
      rate_source: values.rate_source ?? undefined,
    };
    // The createRecurringTransaction function is platform-aware
    await createRecurringTransaction(definition);
  } else {
    // Logic for standard, non-recurring transactions
    const newTransaction: Transaction = {
      id: nanoid(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      date: values.date,
      amount: values.amount,
      currency: values.currency as Transaction["currency"],
      description: values.description ?? null,
      type: finalType,
      category: values.category ?? null,
      is_chomesh: values.is_chomesh ?? false,
      recipient: values.recipient ?? null,
      source_recurring_id: null,
      user_id: null,
      original_amount: values.original_amount ?? null,
      original_currency: values.original_currency ?? null,
      conversion_rate: values.conversion_rate ?? null,
      conversion_date: values.conversion_date ?? null,
      rate_source: values.rate_source ?? null,
    };
    await addTransaction(newTransaction);
  }

  // Clear category cache for this transaction type if a category was provided
  // This ensures new categories appear in the combobox dropdown
  if (values.category) {
    clearCategoryCacheForType(finalType);
  }
}
