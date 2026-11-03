import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { RecurringCard } from "@/lib/ai/recurring-card";
import { cardFromRecurringDraft } from "@/lib/ai/recurring-card";
import { parseDraftAmount } from "@/lib/ai/draft-amount";
import { statedSpecialType, type AnchoredSplitItem, type SpecialType } from "../../../supabase/functions/_shared/ai/split-anchor.ts";

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
  const currency = item.currency === "" ? fallbackCurrency : item.currency;
  const stated = statedSpecialType(item);
  return {
    description: item.description,
    amount: item.amount,
    currency,
    date: item.date ?? "",
    type: stated ?? (item.typeHint === "" ? null : item.typeHint),
    requestedRate: item.requestedRate,
    category: categoryOf(item.category),
    paymentMethod: paymentOf(item.paymentMethod),
    ruleName: item.ruleName,
    checkDate: item.checkDate,
    checkAmount: item.checkAmount === true,
    typeQuestion: stated ? null : item.typeQuestion,
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

/** Without a recurrence read, the card starts with no frequency or day and asks for them. */
export function recurringCardFromItem(item: AnchoredSplitItem, fallbackCurrency: TextTransactionDraft["currency"]): RecurringCard {
  const held = heldFromItem(item, fallbackCurrency);
  const recurrence = item.recurrence;
  return cardFromRecurringDraft({
    amount: held.amount,
    currency: held.currency,
    type: held.type,
    typeQuestion: held.typeQuestion,
    description: held.description,
    category: held.category,
    paymentMethod: held.paymentMethod,
    frequency: recurrence?.frequency ?? null,
    // ponytail: gregorian until the user's calendar reaches this card; the summary shows the dates before saving.
    calendarType: recurrence?.calendarType ?? "gregorian",
    startDate: recurrence?.startDate ?? null,
    dayOfMonth: recurrence?.dayOfMonth ?? null,
    anchorMonthCode: null,
    totalOccurrences: recurrence?.totalOccurrences ?? null,
    endDate: recurrence?.endDate ?? null,
    alreadyCharged: recurrence?.alreadyCharged ?? false,
  });
}

/** A reply that is only digits fills the amount, read like the card field. Anything else goes back to the reader. */
export function digitsOnlyAmount(reply: string): number | null {
  const trimmed = reply.trim();
  return /^[\d.,]+$/.test(trimmed) ? parseDraftAmount(trimmed) : null;
}
