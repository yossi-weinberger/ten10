/**
 * The shape of one movement the assistant can save.
 */

export interface TextTransactionDraft {
  date: string;
  amount: number;
  currency: "ILS" | "USD" | "EUR";
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
}

export type ClarificationField = "type" | "amount" | "special";
