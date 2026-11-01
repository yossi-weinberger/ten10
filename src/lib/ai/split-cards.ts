import type { TextTransactionDraft } from "@/lib/ai/classify-intake";

export interface SplitDraft {
  key: string;
  description: string;
  amount: number;
  currency: TextTransactionDraft["currency"];
  date: string | null;
  type: TextTransactionDraft["type"] | null;
  checked: boolean;
  transactionId: string | null;
  itemId: string | null;
}

export function cardsFromSplit(items: readonly {
  description: string;
  amount: number | null;
  currency: TextTransactionDraft["currency"] | "";
  date: string | null;
  typeHint: TextTransactionDraft["type"] | "";
}[]): SplitDraft[] {
  return items.flatMap((item, index) => {
    if (item.amount === null) return [];
    const type = item.typeHint === "" ? null : item.typeHint;
    const ready = type !== null && item.date !== null && item.currency !== "";
    return [{
      key: `${index}-${item.amount}-${item.description}`,
      description: item.description,
      amount: item.amount,
      currency: item.currency === "" ? "ILS" : item.currency,
      date: item.date,
      type,
      checked: ready,
      transactionId: null,
      itemId: null,
    }];
  });
}
