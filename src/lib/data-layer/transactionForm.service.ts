// This service is dedicated to handling the logic from the TransactionForm
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
import { clearPaymentMethodCache } from "./paymentMethods.service";
import { logger } from "@/lib/logger";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { notifyOnboardingTransactionCreated } from "@/lib/onboarding/transactionBridge";
import { normalizePaymentMethodValue } from "@/lib/payment-methods";
import { buildRecurringDefinition } from "../../../supabase/functions/_shared/transaction-domain/recurring-definition.ts";

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
  const { type, isExempt, isRecognized, isFromPersonalFunds, is_chomesh } =
    values;

  // Normalize the type to base type first (handles editing existing derived types)
  const baseType = normalizeToBaseType(type);

  // Apply checkbox logic based on base type
  if (baseType === "income" && isExempt) {
    return "exempt-income";
  }
  // Expense becomes recognized-expense if either "recognized for maaser" or
  // "recognized for chomesh" is checked (both reduce the tithe balance)
  if (baseType === "expense" && (isRecognized || is_chomesh)) {
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
  const finalType = determineFinalType(values);
  const normalizedPaymentMethod = normalizePaymentMethodValue(
    values.payment_method
  );

  // Logic for recurring transactions
  if (values.is_recurring) {
    const definition: NewRecurringTransaction = buildRecurringDefinition({
      start_date: values.date,
      frequency: values.frequency,
      calendar_type: values.recurring_calendar_type,
      day_of_month: values.recurring_day_of_month,
      total_occurrences: values.recurringTotalCount,
      amount: values.amount,
      currency: values.currency as RecurringTransaction["currency"],
      description: values.description,
      type: finalType,
      category: values.category,
      is_chomesh: values.is_chomesh,
      recipient: values.recipient,
      payment_method: normalizedPaymentMethod,
      original_amount: values.original_amount,
      original_currency:
        values.original_currency as RecurringTransaction["original_currency"],
      conversion_rate: values.conversion_rate,
      conversion_date: values.conversion_date,
      rate_source: values.rate_source,
    });
    // The createRecurringTransaction function is platform-aware
    await createRecurringTransaction(definition);
    trackProductEvent("recurring_obligation_created", {
      type: finalType,
      frequency: definition.frequency,
      currency: definition.currency,
      has_category: !!values.category,
    });
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
      payment_method: normalizedPaymentMethod,
      source_recurring_id: null,
      user_id: null,
      original_amount: values.original_amount ?? null,
      original_currency:
        (values.original_currency as Transaction["original_currency"]) ?? null,
      conversion_rate: values.conversion_rate ?? null,
      conversion_date: values.conversion_date ?? null,
      rate_source: values.rate_source ?? null,
    };
    await addTransaction(newTransaction);
    trackProductEvent("transaction_created", {
      type: finalType,
      currency: values.currency,
      has_category: !!values.category,
      is_chomesh: values.is_chomesh ?? false,
      has_conversion: values.original_currency != null,
    });
    notifyOnboardingTransactionCreated();
  }

  // Clear category cache for this transaction type if a category was provided
  // This ensures new categories appear in the combobox dropdown
  if (values.category) {
    clearCategoryCacheForType(finalType);
  }

  if (normalizedPaymentMethod) {
    clearPaymentMethodCache();
  }
}
