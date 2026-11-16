import type { TransactionFormValues } from "@/lib/schemas";
import type { Currency, Transaction, TransactionType } from "@/types/transaction";
import type { ValidationProfile } from "../../../supabase/functions/_shared/transaction-domain/transaction-types.ts";
import type { NormalizedTransactionRow } from "./import-session.types";

interface EditablePreviewRow {
  id: string;
  normalized: NormalizedTransactionRow;
}

function conversionFieldsForOpen(
  row: NormalizedTransactionRow,
  profile: ValidationProfile,
): Pick<
  Transaction,
  | "amount"
  | "currency"
  | "original_amount"
  | "original_currency"
  | "conversion_rate"
  | "conversion_date"
  | "rate_source"
> {
  switch (profile.foreignCurrency) {
    case "reject":
      return {
        amount: row.amount,
        currency: row.currency,
        original_amount: null,
        original_currency: null,
        conversion_rate: null,
        conversion_date: null,
        rate_source: null,
      };
    case "convert": {
      if (row.original_amount != null && row.original_currency != null) {
        return {
          amount: row.original_amount,
          currency: row.original_currency,
          original_amount: row.original_amount,
          original_currency: row.original_currency,
          conversion_rate: row.conversion_rate,
          conversion_date: row.conversion_date,
          rate_source: row.rate_source,
        };
      }
      return {
        amount: row.amount,
        currency: row.currency,
        original_amount: row.original_amount,
        original_currency: row.original_currency,
        conversion_rate: row.conversion_rate,
        conversion_date: row.conversion_date,
        rate_source: row.rate_source,
      };
    }
    default: {
      const _exhaustive: never = profile.foreignCurrency;
      return _exhaustive;
    }
  }
}

function conversionFieldsForSave(
  values: TransactionFormValues,
  profile: ValidationProfile,
): Pick<
  NormalizedTransactionRow,
  | "original_amount"
  | "original_currency"
  | "conversion_rate"
  | "conversion_date"
  | "rate_source"
> {
  switch (profile.foreignCurrency) {
    case "reject":
      return {
        // Imports never carry conversion data
        original_amount: null,
        original_currency: null,
        conversion_rate: null,
        conversion_date: null,
        rate_source: null,
      };
    case "convert":
      return {
        original_amount: values.original_amount ?? null,
        original_currency: (values.original_currency as Currency | null) ?? null,
        conversion_rate: values.conversion_rate ?? null,
        conversion_date: values.conversion_date ?? null,
        rate_source: values.rate_source ?? null,
      };
    default: {
      const _exhaustive: never = profile.foreignCurrency;
      return _exhaustive;
    }
  }
}

/**
 * Build a Transaction the form can edit. FILE_IMPORT clears conversion.
 * AI_DRAFT opens a foreign row on the original amount and currency.
 */
export function previewRowToTransaction(
  row: EditablePreviewRow,
  profile: ValidationProfile,
): Transaction {
  const n = row.normalized;
  const conversion = conversionFieldsForOpen(n, profile);
  return {
    id: row.id,
    user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    date: n.date,
    description: n.description,
    type: n.type,
    category: n.category,
    is_chomesh: n.is_chomesh,
    recipient: n.recipient,
    payment_method: n.payment_method,
    source_recurring_id: null,
    ...conversion,
  };
}

/**
 * Convert validated form values back into a normalized row.
 * The caller resolves checkbox-derived types before this mapping.
 */
export function formValuesToNormalized(
  values: TransactionFormValues,
  defaultCurrency: Currency,
  existing: NormalizedTransactionRow,
  profile: ValidationProfile,
  finalType: TransactionType,
): NormalizedTransactionRow {
  const isDonation =
    finalType === "donation" || finalType === "non_tithe_donation";

  return {
    ...existing,
    date: values.date,
    amount: values.amount,
    currency: (values.currency as Currency) ?? defaultCurrency,
    description: values.description ?? null,
    type: finalType,
    category: isDonation ? null : (values.category ?? null),
    recipient: values.recipient ?? null,
    payment_method: values.payment_method ?? null,
    is_chomesh: values.is_chomesh ?? false,
    ...conversionFieldsForSave(values, profile),
    source_recurring_id: null,
    occurrence_number: null,
  };
}
