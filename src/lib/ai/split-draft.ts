import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { RecurringCard } from "@/lib/ai/recurring-card";
import { cardFromRecurringDraft } from "@/lib/ai/recurring-card";
import type { AnchoredSplitItem, SpecialType } from "../../../supabase/functions/_shared/ai/split-anchor.ts";

export interface HeldDraft {
  description: string;
  amount: number | null;
  currency: TextTransactionDraft["currency"];
  date: string;
  type: TextTransactionDraft["type"] | null;
  requestedRate: number | null;
  category: TextTransactionDraft["category"];
  paymentMethod: TextTransactionDraft["paymentMethod"];
  ruleName: string | null;
  checkDate: boolean;
  checkAmount: boolean;
  typeQuestion: SpecialType | null;
}

const PAYMENTS = new Set<TextTransactionDraft["paymentMethod"]>([
  "credit_card",
  "cash",
  "bank_transfer",
  "bit_paybox",
  "check",
  null,
]);

function paymentOf(value: AnchoredSplitItem["paymentMethod"]): TextTransactionDraft["paymentMethod"] {
  return PAYMENTS.has(value) ? value : null;
}

function categoryOf(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function heldFromItem(
  item: AnchoredSplitItem,
  fallbackCurrency: TextTransactionDraft["currency"],
): HeldDraft {
  const currency = item.currency === "USD" || item.currency === "EUR" || item.currency === "ILS"
    ? item.currency
    : fallbackCurrency;
  return {
    description: item.description,
    amount: item.amount,
    currency,
    date: item.date ?? "",
    type: item.typeHint === "" ? null : item.typeHint,
    requestedRate: item.requestedRate,
    category: categoryOf(item.category),
    paymentMethod: paymentOf(item.paymentMethod),
    ruleName: item.ruleName,
    checkDate: item.checkDate,
    checkAmount: item.checkAmount === true,
    typeQuestion: item.typeQuestion,
  };
}

export function draftFromHeld(held: HeldDraft): TextTransactionDraft | null {
  if (held.amount === null || held.type === null) return null;
  return {
    date: held.date,
    amount: held.amount,
    currency: held.currency,
    type: held.type,
    requestedRate: held.requestedRate,
    description: held.description,
    category: held.category,
    paymentMethod: held.paymentMethod,
  };
}

export function recurringCardFromItem(item: AnchoredSplitItem, fallbackCurrency: TextTransactionDraft["currency"]): RecurringCard | null {
  if (!item.recurrence) return null;
  const held = heldFromItem(item, fallbackCurrency);
  return cardFromRecurringDraft({
    amount: held.amount,
    currency: held.currency,
    type: held.type,
    description: held.description,
    category: held.category,
    paymentMethod: held.paymentMethod,
    frequency: item.recurrence.frequency,
    calendarType: item.recurrence.calendarType,
    startDate: item.recurrence.startDate,
    dayOfMonth: item.recurrence.dayOfMonth,
    anchorMonthCode: null,
    totalOccurrences: item.recurrence.totalOccurrences,
    alreadyCharged: item.recurrence.alreadyCharged,
  });
}

/** A reply that is only digits fills the amount. Anything else goes back to the reader. */
export function digitsOnlyAmount(reply: string): number | null {
  const trimmed = reply.trim().replace(/,/g, "");
  if (!/^\d+(?:\.\d+)?$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) && value > 0 ? value : null;
}
