import { applyConversion } from "../../../supabase/functions/_shared/transaction-domain/currency-rules.ts";
import type { NormalizedTransactionRow } from "../../../supabase/functions/_shared/transaction-domain/normalize-core.ts";
import type { TransactionDraftV1 } from "./contracts";

export interface DraftToImportOptions {
  defaultCurrency: string;
  /** Local date stored on a manual-rate conversion. */
  conversionDate?: string | null;
}

function emptyConversionRow(
  draft: TransactionDraftV1,
  amount: number,
  currency: string,
  original: { amount: number; currency: string } | null,
): NormalizedTransactionRow {
  return {
    date: draft.date,
    amount,
    currency,
    description: draft.description,
    type: draft.type,
    category: draft.category,
    recipient: draft.recipient,
    payment_method: draft.payment_method,
    is_chomesh: draft.is_chomesh,
    original_amount: original?.amount ?? null,
    original_currency: original?.currency ?? null,
    conversion_rate: null,
    conversion_date: null,
    rate_source: null,
    source_recurring_id: null,
    occurrence_number: null,
  };
}

/**
 * Map a validated draft onto a normalized row.
 * Same currency as the default: no conversion.
 * Foreign currency without requested_rate: keep the source currency and wait.
 * Foreign currency with requested_rate: manual applyConversion.
 * Amounts are stored as absolute values, matching file-import rows.
 */
export function draftToNormalizedRow(
  draft: TransactionDraftV1,
  options: DraftToImportOptions,
): NormalizedTransactionRow {
  const sourceAmount = Math.abs(draft.amount);

  if (draft.currency === options.defaultCurrency) {
    const sameCurrency = applyConversion({
      originalAmount: sourceAmount,
      originalCurrency: draft.currency,
      defaultCurrency: options.defaultCurrency,
      rate: draft.requested_rate ?? 1,
    });
    return emptyConversionRow(draft, sameCurrency.amount, sameCurrency.currency, null);
  }

  if (draft.requested_rate == null) {
    return emptyConversionRow(draft, sourceAmount, draft.currency, {
      amount: sourceAmount,
      currency: draft.currency,
    });
  }

  const converted = applyConversion({
    originalAmount: sourceAmount,
    originalCurrency: draft.currency,
    defaultCurrency: options.defaultCurrency,
    rate: draft.requested_rate,
    conversionDate: options.conversionDate ?? null,
    rateSource: "manual",
  });

  return {
    date: draft.date,
    amount: converted.amount,
    currency: converted.currency,
    description: draft.description,
    type: draft.type,
    category: draft.category,
    recipient: draft.recipient,
    payment_method: draft.payment_method,
    is_chomesh: draft.is_chomesh,
    original_amount: converted.original_amount,
    original_currency: converted.original_currency,
    conversion_rate: converted.conversion_rate,
    conversion_date: converted.conversion_date,
    rate_source: converted.rate_source,
    source_recurring_id: null,
    occurrence_number: null,
  };
}
