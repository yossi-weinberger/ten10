import { applyConversion } from "../../../supabase/functions/_shared/transaction-domain/currency-rules.ts";
import type { TextTransactionDraft } from "../../../supabase/functions/_shared/ai/text-draft.ts";

export interface CommitPayload {
  idempotency_key: string;
  timezone: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  type: TextTransactionDraft["type"];
  category: null;
  recipient: null;
  payment_method: null;
  is_chomesh: false;
  original_amount?: number | null;
  original_currency?: string | null;
  conversion_rate?: number | null;
  conversion_date?: string | null;
  rate_source?: "auto" | "manual" | null;
}

export type BuildCommitResult =
  | { ok: true; payload: CommitPayload }
  | { ok: false; reason: "NO_RATE" };

export function buildCommitPayload(input: {
  draft: TextTransactionDraft;
  defaultCurrency: string;
  autoRate: number | null;
  idempotencyKey: string;
  timezone: string;
}): BuildCommitResult {
  const rate = input.draft.requestedRate ?? input.autoRate;
  if (input.draft.currency !== input.defaultCurrency && (rate === null || rate <= 0)) {
    return { ok: false, reason: "NO_RATE" };
  }

  const converted = applyConversion({
    originalAmount: input.draft.amount,
    originalCurrency: input.draft.currency,
    defaultCurrency: input.defaultCurrency,
    rate: rate ?? 1,
    conversionDate: input.draft.date,
    rateSource: input.draft.requestedRate !== null ? "manual" : "auto",
  });

  return {
    ok: true,
    payload: {
      idempotency_key: input.idempotencyKey,
      timezone: input.timezone,
      date: input.draft.date,
      amount: converted.amount,
      currency: converted.currency,
      description: input.draft.description,
      type: input.draft.type,
      category: null,
      recipient: null,
      payment_method: null,
      is_chomesh: false,
      original_amount: converted.original_amount,
      original_currency: converted.original_currency,
      conversion_rate: converted.conversion_rate,
      conversion_date: converted.conversion_date,
      rate_source: converted.rate_source,
    },
  };
}
