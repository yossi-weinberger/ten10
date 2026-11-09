import { applyConversion } from "../../../supabase/functions/_shared/transaction-domain/currency-rules.ts";
import { donationRecipient, type TextTransactionDraft } from "../../../supabase/functions/_shared/ai/text-draft.ts";
import { getCurrentLocalDate } from "@/lib/utils/local-date";

export interface CommitPayload {
  idempotency_key: string;
  timezone: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  type: TextTransactionDraft["type"];
  category: string | null;
  recipient: string | null;
  payment_method: string | null;
  is_chomesh: boolean;
  original_amount?: number | null;
  original_currency?: string | null;
  conversion_rate?: number | null;
  conversion_date?: string | null;
  rate_source?: "auto" | "manual" | null;
}

export type BuildCommitResult =
  | { ok: true; payload: CommitPayload }
  | { ok: false; reason: "NO_RATE" };

export { donationRecipient };

export function buildCommitPayload(input: {
  draft: TextTransactionDraft;
  defaultCurrency: string;
  autoRate: number | null;
  idempotencyKey: string;
  timezone: string;
  /** Chomesh on an income, from the card (which starts from settings.autoCalcChomesh). */
  isChomesh: boolean;
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
    // The day the rate was taken, like the form: today, for a fetched rate and for a typed one.
    conversionDate: getCurrentLocalDate(),
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
      category: input.draft.category,
      recipient: donationRecipient(input.draft),
      payment_method: input.draft.paymentMethod,
      // Only an ordinary income carries chomesh. exempt-income never does, like the form.
      is_chomesh: input.draft.type === "income" ? Boolean(input.isChomesh) : false,
      original_amount: converted.original_amount,
      original_currency: converted.original_currency,
      conversion_rate: converted.conversion_rate,
      conversion_date: converted.conversion_date,
      rate_source: converted.rate_source,
    },
  };
}
