/**
 * The shape of one movement the assistant can save.
 */

import type { SupportedCurrencyCode } from "../transaction-domain/normalize-core.ts";

export interface TextTransactionDraft {
  date: string;
  amount: number;
  currency: SupportedCurrencyCode;
  type:
    | "expense"
    | "income"
    | "donation"
    | "exempt-income"
    | "recognized-expense"
    | "non_tithe_donation";
  requestedRate: number | null;
  description: string;
  category: string | null;
  paymentMethod: "credit_card" | "cash" | "bank_transfer" | "bit_paybox" | "check" | null;
  /** The payee of a donation. Saved to transactions.recipient, like the form. Ignored for other types. */
  recipient?: string | null;
  /** Chomesh on an income. Starts from settings.autoCalcChomesh, like the form. Ignored for other types. */
  isChomesh?: boolean;
}

export type ClarificationField = "type" | "amount" | "special";
