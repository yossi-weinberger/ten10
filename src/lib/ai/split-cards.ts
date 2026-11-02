import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { statedSpecialType, type SpecialType } from "../../../supabase/functions/_shared/ai/split-anchor.ts";

export interface SplitDraft {
  key: string;
  description: string;
  amount: number;
  currency: TextTransactionDraft["currency"];
  date: string | null;
  type: TextTransactionDraft["type"] | null;
  category: TextTransactionDraft["category"];
  paymentMethod: TextTransactionDraft["paymentMethod"];
  /** Chomesh on an income row. Starts from settings.autoCalcChomesh. */
  isChomesh: boolean;
  checked: boolean;
  transactionId: string | null;
  itemId: string | null;
}

const PAYMENTS: ReadonlySet<string> = new Set(["credit_card", "cash", "bank_transfer", "bit_paybox", "check"]);

function paymentOf(value: string | null | undefined): TextTransactionDraft["paymentMethod"] {
  return value && PAYMENTS.has(value) ? value as TextTransactionDraft["paymentMethod"] : null;
}

function categoryOf(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function cardsFromSplit(
  items: readonly {
    description: string;
    amount: number | null;
    currency: TextTransactionDraft["currency"] | "";
    date: string | null;
    typeHint: TextTransactionDraft["type"] | "";
    typeQuestion?: SpecialType | null;
    specialStated?: boolean;
    category?: string | null;
    paymentMethod?: string | null;
  }[],
  options: { defaultCurrency?: TextTransactionDraft["currency"]; autoCalcChomesh?: boolean } = {},
): SplitDraft[] {
  const fallbackCurrency = options.defaultCurrency ?? "ILS";
  return items.flatMap((item, index) => {
    if (item.amount === null) return [];
    const type = statedSpecialType({ specialStated: item.specialStated, typeQuestion: item.typeQuestion ?? null })
      ?? (item.typeHint === "" ? null : item.typeHint);
    const ready = type !== null && item.date !== null && item.currency !== "";
    return [{
      key: `${index}-${item.amount}-${item.description}`,
      description: item.description,
      amount: item.amount,
      currency: item.currency === "" ? fallbackCurrency : item.currency,
      date: item.date,
      type,
      category: categoryOf(item.category),
      paymentMethod: paymentOf(item.paymentMethod),
      isChomesh: type === "income" && options.autoCalcChomesh === true,
      checked: ready,
      transactionId: null,
      itemId: null,
    }];
  });
}
