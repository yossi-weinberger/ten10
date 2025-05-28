import { create } from "zustand";
import { Transaction } from "../types/transaction";
import {
  TableTransactionFilters,
  TableSortConfig,
  TablePaginationState,
  initialTableTransactionFilters,
  initialTableSortConfig,
  initialTablePaginationState,
} from "../types/tableTransactions.types";
import { TableTransactionsService } from "./tableTransactions.service";
import { Platform } from "@/contexts/PlatformContext"; // Import Platform type

export interface TableTransactionsState {
  // State
  transactions: Transaction[];
  filters: TableTransactionFilters;
  sorting: TableSortConfig;
  pagination: TablePaginationState;
  loading: boolean;
  error: string | null;

  // Actions
  fetchTransactions: (reset?: boolean, platform?: Platform) => Promise<void>;
  setLoadMorePagination: () => void;
  setFilters: (filters: Partial<TableTransactionFilters>) => void;
  setSorting: (newSortField: keyof Transaction | string) => void; // Changed signature
  updateTransactionState: (id: string, updates: Partial<Transaction>) => void;
  deleteTransactionState: (id: string) => void;
  resetFiltersState: () => void;
  resetStore: () => void;
}

export const useTableTransactionsStore = create<TableTransactionsState>()(
  (set, get) => ({
    // Initial State
    transactions: [],
    filters: initialTableTransactionFilters,
    sorting: initialTableSortConfig,
    pagination: initialTablePaginationState,
    loading: false,
    error: null,

    // Actions
    fetchTransactions: async (reset?: boolean, platform?: Platform) => {
      if (!platform || platform === "loading") {
        console.warn(
          "TableTransactionsStore: fetchTransactions called without a valid platform. Aborting.",
          platform
        );
        set({
          loading: false,
          error: "Platform not determined for fetching transactions.",
        });
        return;
      }
      const { filters, sorting, pagination } = get();
      let currentPage = pagination.currentPage;
      let currentTransactions = get().transactions;

      if (reset) {
        currentPage = 1;
        currentTransactions = [];
        set({
          pagination: {
            ...pagination,
            currentPage: 1,
            totalCount: 0,
            hasMore: true,
          },
          transactions: [],
        });
      }

      set({ loading: true, error: null });

      try {
        const offset = (currentPage - 1) * pagination.itemsPerPage;
        const limit = pagination.itemsPerPage;

        const { data, totalCount: newTotalCount } =
          await TableTransactionsService.fetchTransactions({
            offset,
            limit,
            filters,
            sorting,
            platform,
          });

        console.log(
          "TableTransactionsStore: Received from service - Data length:",
          data?.length,
          "Total count:",
          newTotalCount
        );

        const newTransactions = reset
          ? data
          : [...currentTransactions, ...data];
        const hasMore = newTransactions.length < newTotalCount;

        console.log(
          "TableTransactionsStore: New transactions length:",
          newTransactions.length,
          "Has more:",
          hasMore
        );

        set({
          transactions: newTransactions,
          pagination: {
            ...pagination,
            currentPage,
            totalCount: newTotalCount,
            hasMore,
          },
          loading: false,
        });
      } catch (err: any) {
        console.error("Failed to fetch table transactions:", err);
        set({
          error: err.message || "Failed to fetch transactions",
          loading: false,
        });
      }
    },

    setLoadMorePagination: () => {
      const { pagination, loading, error } = get();
      if (!loading && pagination.hasMore && !error) {
        set({
          pagination: {
            ...pagination,
            currentPage: pagination.currentPage + 1,
          },
        });
      }
    },

    setFilters: (newFilters) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      }));
    },

    setSorting: (newSortField) => {
      // newSortField is keyof Transaction | string
      const currentSorting = get().sorting;
      let newDirection: "asc" | "desc" = "asc";
      if (
        currentSorting.field === newSortField &&
        currentSorting.direction === "asc"
      ) {
        newDirection = "desc";
      }
      set({ sorting: { field: newSortField, direction: newDirection } });
      // The component (TransactionsTable.tsx) will observe 'sorting' changes and trigger fetch.
    },

    updateTransactionState: (id, updates) => {
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      }));
    },

    deleteTransactionState: (id) => {
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));
    },

    resetFiltersState: () => {
      set({ filters: initialTableTransactionFilters });
    },

    resetStore: () => {
      set({
        transactions: [],
        filters: initialTableTransactionFilters,
        sorting: initialTableSortConfig,
        pagination: initialTablePaginationState,
        loading: false,
        error: null,
      });
    },
  })
);
