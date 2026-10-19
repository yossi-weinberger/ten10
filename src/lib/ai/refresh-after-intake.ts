import { useDonationStore } from "@/lib/store";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";

export function refreshAfterIntakeSave(): void {
  useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
  void useTableTransactionsStore.getState().fetchTransactions(true, "web");
}

export function refreshOnVisible(state: DocumentVisibilityState): void {
  if (state !== "visible") return;
  refreshAfterIntakeSave();
}
