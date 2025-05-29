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
import { TableTransactionsService } from "./transactionService.ts";
import { Platform } from "@/contexts/PlatformContext"; // Import Platform type
import { exportTransactionsToPDF } from "./utils/export-pdf";
import { exportTransactionsToExcel } from "./utils/export-excel";
import { exportTransactionsToCSV } from "./utils/export-csv"; // Import CSV export function
import { supabase } from "@/lib/supabaseClient"; // Import supabase client
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
  // realtimeChannel: RealtimeChannel | null; // REMOVED: For Supabase realtime subscription
  // transactionPendingUndo: { // Removed for direct delete
  //   transaction: Transaction;
  //   timeoutId: NodeJS.Timeout;
  // } | null; // For undo delete

  // Actions
  fetchTransactions: (reset?: boolean, platform?: Platform) => Promise<void>;
  setLoadMorePagination: () => void;
  setFilters: (filters: Partial<TableTransactionFilters>) => void;
  setSorting: (newSortField: keyof Transaction | string) => void; // Changed signature
  updateTransactionState: (id: string, updates: Partial<Transaction>) => void; // For optimistic updates
  deleteTransactionState: (id: string) => void; // For optimistic updates
  deleteTransaction: (id: string, platform: Platform) => Promise<void>; // Actual delete action
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>,
    platform: Platform
  ) => Promise<void>; // Actual update action
  exportTransactions: (
    format: "csv" | "excel" | "pdf",
    platform: Platform
  ) => Promise<void>; // Added for export
  // setupRealtimeSubscription: (userId: string) => void; // REMOVED
  // cleanupRealtimeSubscription: () => void; // REMOVED
  // undoDeleteTransaction: () => Promise<void>; // Removed for direct delete
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
    // realtimeChannel: null, // REMOVED
    // transactionPendingUndo: null, // Removed for direct delete

    // Actions
    fetchTransactions: async (reset?: boolean, platform?: Platform) => {
      console.log(
        `TableTransactionsStore: fetchTransactions called. Reset: ${reset}, Platform: ${platform}, Current loading: ${
          get().loading
        }`
      );
      if (get().loading && !reset) {
        // If already loading and this is not a reset call (e.g. from loadMore), prevent re-fetch.
        // A reset call (e.g. from filter/sort change) should proceed.
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
        transactions: state.transactions.map(
          (t) =>
            t.id === id
              ? { ...t, ...updates, updated_at: new Date().toISOString() }
              : t // Also update updated_at optimistically
        ),
      }));
    },

    updateTransaction: async (id, updates, platform) => {
      const originalTransactions = get().transactions;
      // Find the specific transaction to get its original state for potential rollback
      const transactionToUpdate = originalTransactions.find((t) => t.id === id);
      if (!transactionToUpdate) {
        console.error("Transaction to update not found in store:", id);
        set({ error: "Transaction to update not found." });
        return;
      }
      const originalTransactionState = { ...transactionToUpdate };

      // Optimistic update
      get().updateTransactionState(id, updates);
      set({ error: null }); // Clear previous errors

      try {
        const updatedTransactionFromServer =
          await TableTransactionsService.updateTransaction(
            id,
            updates,
            platform
          );
        // If successful, update the state with the potentially more complete/accurate data from server
        get().updateTransactionState(id, updatedTransactionFromServer);
        // Consider adding a toast notification for success.
      } catch (err: any) {
        console.error("Failed to update transaction:", err);
        // Revert optimistic update
        get().updateTransactionState(id, originalTransactionState);
        set({
          error: err.message || "Failed to update transaction.",
        });
        // Consider adding a toast notification for failure.
      }
    },

    deleteTransactionState: (id) => {
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        pagination: {
          ...state.pagination,
          totalCount: Math.max(0, state.pagination.totalCount - 1),
        }, // Adjust total count
      }));
    },

    deleteTransaction: async (id, platform) => {
      const originalTransactions = get().transactions;
      const originalPagination = get().pagination;
      const transactionToDelete = originalTransactions.find((t) => t.id === id); // Keep a reference for potential rollback

      if (!transactionToDelete) {
        console.error("Transaction to delete not found in store:", id);
        set({ error: "Transaction to delete not found." });
        return;
      }

      // Optimistic update
      get().deleteTransactionState(id);
      set({ error: null }); // Clear previous errors

      try {
        await TableTransactionsService.deleteTransaction(id, platform);
        // If successful, the optimistic update is already done.
        // TODO: Toast "Transaction deleted successfully" (from component or here)
      } catch (err: any) {
        console.error("Failed to delete transaction from server:", err);
        // Revert optimistic update
        set({
          error: err.message || "Failed to delete transaction.",
          transactions: originalTransactions, // Revert to original transactions list
          pagination: originalPagination, // Revert pagination to original state
        });
        // TODO: Toast "Failed to delete transaction from server" (from component or here)
        throw err; // Re-throw to allow component to also handle if needed
      }
    },

    // undoDeleteTransaction: async () => { // Removed
    // },

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

    exportTransactions: async (format, platform) => {
      const { filters } = get();
      set({ exportLoading: true, exportError: null, error: null }); // Use exportLoading and clear general error

      try {
        // Step 1: Fetch all transactions based on current filters
        // This service method and the corresponding RPC need to be implemented
        const transactionsToExport =
          await TableTransactionsService.getTransactionsForExport(
            filters,
            platform
          );

        if (!transactionsToExport || transactionsToExport.length === 0) {
          console.warn("No transactions to export.");
          set({ exportLoading: false, exportError: "אין נתונים ליצוא." });
          // User will see this error via toast in ExportButton
          return;
        }

        // Step 2: Perform the export based on the format
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
        // Success toast will be shown in ExportButton
      } catch (err: any) {
        console.error(`Failed to export transactions to ${format}:`, err);
        set({
          exportError: err.message || `Failed to export to ${format}`,
          exportLoading: false,
        });
        // Error toast will be shown in ExportButton
      }
    },

    // setupRealtimeSubscription: (userId) => { // REMOVED
    // },

    // cleanupRealtimeSubscription: () => { // REMOVED
    // },
  })
);
