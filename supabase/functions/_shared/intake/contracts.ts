import { z } from "zod";
import type { SupportedCurrencyCode } from "../transaction-domain/normalize-core.ts";
import { AI_DRAFT_ALLOWED_TYPES } from "../transaction-domain/transaction-types.ts";

export const TRANSACTION_DRAFT_V1_VERSION = 1;

/**
 * Codes accepted by normalize-core. A missing or extra code fails typecheck.
 */
const CURRENCY_CODES = [
  "ILS",
  "USD",
  "EUR",
  "CAD",
  "GBP",
  "AUD",
  "CHF",
  "ARS",
  "BRL",
  "ZAR",
  "MXN",
  "UAH",
] as const satisfies readonly SupportedCurrencyCode[];

type _AllCurrenciesListed = Exclude<
  SupportedCurrencyCode,
  (typeof CURRENCY_CODES)[number]
> extends never
  ? true
  : never;
const _currencyCodesCoverDomain: _AllCurrenciesListed = true;
void _currencyCodesCoverDomain;

/**
 * What the model returns. Amount and currency are the source values.
 * The model does not convert currency. A manual rate is requested_rate.
 */
export const transactionDraftV1Schema = z.object({
  schema_version: z.literal(TRANSACTION_DRAFT_V1_VERSION),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().finite().refine((amount) => amount !== 0),
  currency: z.enum(CURRENCY_CODES),
  type: z.enum(AI_DRAFT_ALLOWED_TYPES),
  description: z.string().nullable(),
  category: z.string().nullable(),
  recipient: z.string().nullable(),
  payment_method: z.string().nullable(),
  is_chomesh: z.boolean(),
  requested_rate: z.number().finite().positive().nullable(),
});

export type TransactionDraftV1 = z.infer<typeof transactionDraftV1Schema>;
