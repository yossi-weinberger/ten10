import { isIsoDate } from "@/lib/ai/receipt-card";
import { parseDraftAmount } from "@/lib/ai/draft-amount";
import { isOnOrAfterMinTransactionDate } from "@/lib/utils/transaction-date";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { SplitDraft } from "@/lib/ai/split-cards";
import type { StatusKey } from "./assistant-reply-view";

export function draftSaveBlocker(
  draft: TextTransactionDraft,
  amountInput: string,
): StatusKey | null {
  if (!isIsoDate(draft.date)) return "editDateInvalid";
  if (!isOnOrAfterMinTransactionDate(draft.date)) return "dateMin";
  if (parseDraftAmount(amountInput) === null) return "editAmountInvalid";
  return null;
}

export function saveFailureStatus(reason: string): StatusKey {
  return reason === "NO_RATE" ? "noRateAvailable" : "saveFailed";
}

export function undoFailureStatus(reason: string): StatusKey {
  return reason === "NOT_ALLOWED" ? "undoNotAllowed" : "undoFailed";
}

export function splitDraftsAfterSave(
  cards: SplitDraft[],
  saved: { key: string; transactionId: string; itemId: string }[],
): SplitDraft[] {
  return cards.map((card) => {
    const row = saved.find((item) => item.key === card.key);
    return row
      ? { ...card, transactionId: row.transactionId, itemId: row.itemId, checked: false }
      : card;
  });
}

export function splitDraftsAfterUndo(
  current: SplitDraft[] | null,
  key: string,
): SplitDraft[] | null {
  return current?.map((item) => (
    item.key === key ? { ...item, transactionId: null, itemId: null, checked: true } : item
  )) ?? null;
}
