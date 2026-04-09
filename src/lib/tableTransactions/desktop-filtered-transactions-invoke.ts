import type { Transaction } from "@/types/transaction";

/**
 * Mirrors `GetFilteredTransactionsArgs` / `TableFiltersPayload` on the Tauri side
 * (`get_filtered_transactions_handler`). Single place for the desktop table query shape.
 */
export type DesktopFilteredTransactionsFilters = {
  search: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  types: string[] | null;
  paymentMethods: string[] | null;
  showOnly: string | null;
  recurringStatuses: string[] | null;
  recurringFrequencies: string[] | null;
};

export type DesktopFilteredTransactionsArgs = {
  filters: DesktopFilteredTransactionsFilters;
  pagination: { page: number; limit: number };
  sorting: { field: string; direction: string };
};

export type DesktopFilteredTransactionsResponse = {
  transactions: Transaction[];
  totalCount: number;
};

/** Default “no filters” — matches an empty table filter state. */
export const EMPTY_DESKTOP_TABLE_FILTERS: DesktopFilteredTransactionsFilters = {
  search: null,
  dateFrom: null,
  dateTo: null,
  types: null,
  paymentMethods: null,
  showOnly: null,
  recurringStatuses: null,
  recurringFrequencies: null,
};

/**
 * Invokes `get_filtered_transactions_handler` with merged defaults (same IPC path as the interactive table).
 */
export async function invokeDesktopFilteredTransactions(
  partial: {
    filters?: Partial<DesktopFilteredTransactionsFilters>;
    pagination?: Partial<DesktopFilteredTransactionsArgs["pagination"]>;
    sorting?: Partial<DesktopFilteredTransactionsArgs["sorting"]>;
  } = {}
): Promise<DesktopFilteredTransactionsResponse> {
  const { invoke } = await import("@tauri-apps/api/core");
  const args: DesktopFilteredTransactionsArgs = {
    filters: { ...EMPTY_DESKTOP_TABLE_FILTERS, ...partial.filters },
    pagination: { page: 1, limit: 10_000, ...partial.pagination },
    sorting: { field: "date", direction: "desc", ...partial.sorting },
  };
  return invoke<DesktopFilteredTransactionsResponse>(
    "get_filtered_transactions_handler",
    { args }
  );
}

const PAGE_SIZE = 10_000;

/**
 * Fetches every row matching the given filters (same defaults as the table with no filters).
 * Used for store hydration where a single page must not truncate above PAGE_SIZE.
 */
export async function invokeDesktopFilteredTransactionsAllPages(
  partial: {
    filters?: Partial<DesktopFilteredTransactionsFilters>;
    sorting?: Partial<DesktopFilteredTransactionsArgs["sorting"]>;
  } = {}
): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let page = 1;
  while (true) {
    const response = await invokeDesktopFilteredTransactions({
      ...partial,
      pagination: { page, limit: PAGE_SIZE },
    });
    const batch = response.transactions ?? [];
    all.push(...batch);
    const total = response.totalCount ?? 0;
    if (batch.length === 0 || all.length >= total) {
      break;
    }
    page += 1;
  }
  return all;
}
