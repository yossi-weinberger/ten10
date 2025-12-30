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
import { logger } from "@/lib/logger";

/**
 * Determines the final transaction type based on form values,
 * especially the state of specific checkboxes.
 * @param values - The data from the transaction form.
 * @returns The specific TransactionType.
 */
export function determineFinalType(
  values: TransactionFormValues
): TransactionType {
  const { type, isExempt, isRecognized, isFromPersonalFunds } = values;

  if (type === "income" && isExempt) {
    return "exempt-income";
  }
  if (type === "expense" && isRecognized) {
    return "recognized-expense";
  }
  if (type === "donation" && isFromPersonalFunds) {
    return "non_tithe_donation";
  }

  // If none of the special conditions are met, return the base type.
  return type;
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

  // For recurring transactions, the day of the month is derived from the start date.
  // Using getUTCDate to avoid timezone-related off-by-one errors.
  const dayOfMonth = new Date(values.date).getUTCDate();

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
    };
    await addTransaction(newTransaction);
  }
}
