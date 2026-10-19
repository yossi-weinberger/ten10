import { applyForwardRule, type ActiveUserRule, type TextTransactionDraft } from "@/lib/ai/classify-intake";
import { isIsoDate } from "../../../supabase/functions/_shared/ai/receipt-draft.ts";

export { isIsoDate };

export interface ReceiptFields {
  date: string;
  amount: number;
  currency: TextTransactionDraft["currency"];
  description: string;
}

/** A receipt has no transaction type until the user answers, or a saved rule names one. */
export function receiptAsDraft(
  fields: ReceiptFields,
  type: TextTransactionDraft["type"],
): TextTransactionDraft {
  return {
    date: fields.date,
    amount: fields.amount,
    currency: fields.currency,
    type,
    requestedRate: null,
    description: fields.description,
    category: null,
    paymentMethod: null,
  };
}

/** A saved rule can name the type. Otherwise the receipt still needs the user's answer. */
export function receiptRuledDraft(
  fields: ReceiptFields,
  rules: readonly ActiveUserRule[],
): { draft: TextTransactionDraft; ruleName: string } | null {
  const applied = applyForwardRule(receiptAsDraft(fields, "expense"), rules, fields.description);
  if (!applied.ruleName) return null;
  return { draft: applied.draft, ruleName: applied.ruleName };
}
