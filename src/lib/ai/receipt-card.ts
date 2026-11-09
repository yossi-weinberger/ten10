import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { isIsoDate, type ReceiptRuledType } from "../../../supabase/functions/_shared/ai/receipt-draft.ts";

export { isIsoDate };

export interface ReceiptFields {
  date: string | null;
  checkDate: boolean;
  amount: number;
  currency: TextTransactionDraft["currency"];
  description: string;
  ruleName: string | null;
  ruledType: ReceiptRuledType | null;
}

/** A receipt has no transaction type until the user answers, or a saved rule names one. */
export function receiptAsDraft(
  fields: ReceiptFields,
  type: TextTransactionDraft["type"],
): TextTransactionDraft {
  return {
    date: fields.date ?? "",
    amount: fields.amount,
    currency: fields.currency,
    type,
    requestedRate: null,
    description: fields.description,
    category: null,
    paymentMethod: null,
  };
}
