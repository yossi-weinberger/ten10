import { useDonationStore } from "@/lib/store";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";

export function refreshAfterIntakeSave(): void {
  useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
  void useTableTransactionsStore.getState().fetchTransactions(true, "web");
}

export function refreshOnVisible(state: DocumentVisibilityState): void {
  if (state !== "visible") return;
  useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
  // A reset reload drops the rows a user loaded with "more"; leave a deeper table where it is.
  if (useTableTransactionsStore.getState().pagination.currentPage > 1) return;
  void useTableTransactionsStore.getState().fetchTransactions(true, "web");
}
