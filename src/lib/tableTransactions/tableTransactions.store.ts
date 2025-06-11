import { create } from "zustand";
import { Transaction } from "../../types/transaction"; // Updated path
import {
  TableTransactionFilters,
  TableSortConfig,
  TablePaginationState,
  initialTableTransactionFilters,
  initialTableSortConfig,
  initialTablePaginationState,
} from "./tableTransactions.types"; // Updated path
import { TableTransactionsService } from "./tableTransactionService"; // Updated path
import { Platform } from "@/contexts/PlatformContext"; // Path should be relative to new location
import { exportTransactionsToPDF } from "../utils/export-pdf"; // Updated path
import { exportTransactionsToExcel } from "../utils/export-excel"; // Updated path
import { exportTransactionsToCSV } from "../utils/export-csv"; // Updated path
import { supabase } from "../supabaseClient"; // Updated path
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

export interface TableTransactionsState {
  // State
  transactions: Transaction[];
  filters: TableTransactionFilters;
  sorting: TableSortConfig;
  pagination: TablePaginationState;
  loading: boolean; // General loading for fetching transactions
  error: string | null; // General error for fetching transactions
  exportLoading: boolean; // Specific loading for export action
  exportError: string | null; // Specific error for export action

  // Actions
  fetchTransactions: (reset?: boolean, platform?: Platform) => Promise<void>;
  setLoadMorePagination: () => void;
  setFilters: (filters: Partial<TableTransactionFilters>) => void;
  setSorting: (newSortField: keyof Transaction | string) => void;
  updateTransactionState: (id: string, updates: Partial<Transaction>) => void;
  deleteTransactionState: (id: string) => void;
  deleteTransaction: (id: string, platform: Platform) => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>,
    platform: Platform
  ) => Promise<void>;
  exportTransactions: (
    format: "csv" | "excel" | "pdf",
    platform: Platform
  ) => Promise<void>;
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
    exportLoading: false,
    exportError: null,

    // Actions
    fetchTransactions: async (reset?: boolean, platform?: Platform) => {
      console.log(
        `TableTransactionsStore: fetchTransactions called. Reset: ${reset}, Platform: ${platform}, Current loading: ${
          get().loading
        }`
      );
      if (get().loading && !reset) {
        console.log(
          "TableTransactionsStore: fetchTransactions - already loading and not a reset, aborting."
        );
        return;
      }

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
      console.log(
        `TableTransactionsStore: setSorting called with newSortField: ${String(
          newSortField
        )}`
      );
      const currentSorting = get().sorting;
      let newDirection: "asc" | "desc" = "asc";
      if (
        currentSorting.field === newSortField &&
        currentSorting.direction === "asc"
      ) {
        newDirection = "desc";
      }
      set({ sorting: { field: newSortField, direction: newDirection } });
    },

    updateTransactionState: (id, updates) => {
      set((state) => ({
        transactions: state.transactions.map((t) =>
          t.id === id
            ? { ...t, ...updates, updated_at: new Date().toISOString() }
            : t
        ),
      }));
    },

    updateTransaction: async (id, updates, platform) => {
      const originalTransactions = get().transactions;
      const transactionToUpdate = originalTransactions.find((t) => t.id === id);
      if (!transactionToUpdate) {
        console.error("Transaction to update not found in store:", id);
        set({ error: "Transaction to update not found." });
        return;
      }
      const originalTransactionState = { ...transactionToUpdate };

      // Optimistic update
      get().updateTransactionState(id, updates);
      set({ error: null });

      try {
        // Call the service (which now calls dataService and returns void)
        await TableTransactionsService.updateTransaction(id, updates, platform);
        // After successful update via dataService (which updates lastDbFetchTimestamp),
        // we rely on optimistic update for table smoothness. Other components (like StatsCards) will update via lastDbFetchTimestamp.
        console.log(
          `TableTransactionsStore: Update for ${id} successful on server. Optimistic update applied to table.`
        );
      } catch (err: any) {
        console.error("Failed to update transaction:", err);
        // Rollback optimistic update
        get().updateTransactionState(id, originalTransactionState);
        set({
          error: err.message || "Failed to update transaction.",
        });
        // Optionally re-throw if the caller needs to handle it further
        // throw err;
      }
    },

    deleteTransactionState: (id) => {
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        pagination: {
          ...state.pagination,
          totalCount: Math.max(0, state.pagination.totalCount - 1),
        },
      }));
    },

    deleteTransaction: async (id, platform) => {
      const originalTransactions = get().transactions;
      const originalPagination = get().pagination;
      const transactionToDelete = originalTransactions.find((t) => t.id === id);

      if (!transactionToDelete) {
        console.error("Transaction to delete not found in store:", id);
        set({ error: "Transaction to delete not found." });
        return;
      }

      // Optimistic update
      get().deleteTransactionState(id);
      set({ error: null });

      try {
        await TableTransactionsService.deleteTransaction(id, platform);
        // After successful deletion via dataService (which updates lastDbFetchTimestamp),
        // we rely on optimistic update for table smoothness. Other components (like StatsCards) will update via lastDbFetchTimestamp.
        console.log(
          `TableTransactionsStore: Deletion for ${id} successful on server. Optimistic update applied to table.`
        );
      } catch (err: any) {
        console.error("Failed to delete transaction from server:", err);
        // Rollback optimistic update
        set({
          error: err.message || "Failed to delete transaction.",
          transactions: originalTransactions,
          pagination: originalPagination,
        });
        throw err;
      }
    },

    resetFiltersState: () => {
      set({
        filters: initialTableTransactionFilters,
        pagination: {
          ...get().pagination,
          currentPage: 1,
        },
      });
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

    exportTransactions: async (format, platform) => {
      const { filters } = get();
      set({ exportLoading: true, exportError: null, error: null });

      try {
        const transactionsToExport =
          await TableTransactionsService.getTransactionsForExport(
            filters,
            platform
          );

        if (!transactionsToExport || transactionsToExport.length === 0) {
          console.warn("No transactions to export.");
          set({ exportLoading: false, exportError: "אין נתונים ליצוא." });
          return;
        }

        if (format === "pdf") {
          await exportTransactionsToPDF(transactionsToExport);
        } else if (format === "excel") {
          await exportTransactionsToExcel(transactionsToExport);
        } else if (format === "csv") {
          await exportTransactionsToCSV(transactionsToExport);
        } else {
          throw new Error("Unsupported export format");
        }
        set({ exportLoading: false, exportError: null });
      } catch (err: any) {
        console.error(`Failed to export transactions to ${format}:`, err);
        set({
          exportError: err.message || `Failed to export to ${format}`,
          exportLoading: false,
        });
      }
    },
  })
);
