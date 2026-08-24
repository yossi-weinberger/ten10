import { create } from "zustand";
import { RecurringTransaction } from "@/types/transaction";
import {
  deleteRecurringBulk,
  fetchAllRecurring,
  updateRecurringBulk,
} from "./recurringTable.service";
import type { BulkMutationResult, RecurringBulkPatch } from "./bulkActions";
import { getErrorMessage } from "@/lib/utils/error-message";

export interface RecurringTableSortConfig {
  field: string;
  direction: "asc" | "desc";
}

export interface RecurringTableFilters {
  search: string;
  statuses: string[];
  types: string[];
  frequencies: string[];
}

export interface RecurringTableState {
  recurring: RecurringTransaction[];
  loading: boolean;
  error: string | null;
  bulkLoading: boolean;
  bulkError: string | null;
  sorting: RecurringTableSortConfig;
  filters: RecurringTableFilters;
  fetchRecurring: (rejectOnError?: boolean) => Promise<void>;
  deleteRecurringBulk: (
    ids: readonly string[],
  ) => Promise<BulkMutationResult>;
  updateRecurringBulk: (
    ids: readonly string[],
    patch: RecurringBulkPatch
  ) => Promise<BulkMutationResult>;
  setSorting: (field: string) => void;
  setFilters: (newFilters: Partial<RecurringTableFilters>) => void;
  resetFilters: () => void;
  resetStore: () => void;
}

const initialSortConfig: RecurringTableSortConfig = {
  field: "next_due_date",
  direction: "asc",
};

const initialFilters: RecurringTableFilters = {
  search: "",
  statuses: [],
  types: [],
  frequencies: [],
};

let fetchGeneration = 0;

export const useRecurringTableStore = create<RecurringTableState>()(
  (set, get) => ({
    recurring: [],
    loading: false,
    error: null,
    bulkLoading: false,
    bulkError: null,
    sorting: initialSortConfig,
    filters: initialFilters,
    fetchRecurring: async (rejectOnError?: boolean) => {
      const requestGeneration = ++fetchGeneration;
      set({ loading: true, error: null });
      try {
        const { sorting, filters } = get();
        const data = await fetchAllRecurring(sorting, filters);
        if (requestGeneration !== fetchGeneration) {
          return;
        }
        set({ recurring: data, loading: false });
      } catch (err: unknown) {
        if (requestGeneration !== fetchGeneration) {
          return;
        }
        set({
          error:
            getErrorMessage(err) ?? "Failed to fetch recurring transactions",
          loading: false,
        });
        if (rejectOnError) {
          throw err;
        }
      }
    },
    deleteRecurringBulk: async (ids) => {
      if (get().bulkLoading) {
        throw new Error("Bulk action already in progress");
      }

      set({ bulkLoading: true, bulkError: null });
      try {
        await deleteRecurringBulk(ids);
      } catch (err: unknown) {
        const message =
          getErrorMessage(err) ?? "Failed to delete recurring transactions";
        set({ bulkError: message, bulkLoading: false });
        throw err;
      }

      try {
        await get().fetchRecurring(true);
        set({ bulkLoading: false });
        return { refreshError: null };
      } catch (err: unknown) {
        const refreshError =
          getErrorMessage(err) ??
          "Failed to refresh recurring transactions";
        set({ bulkLoading: false });
        return { refreshError };
      }
    },
    updateRecurringBulk: async (ids, patch) => {
      if (get().bulkLoading) {
        throw new Error("Bulk action already in progress");
      }

      set({ bulkLoading: true, bulkError: null });
      try {
        await updateRecurringBulk(ids, patch);
      } catch (err: unknown) {
        const message =
          getErrorMessage(err) ?? "Failed to update recurring transactions";
        set({ bulkError: message, bulkLoading: false });
        throw err;
      }

      try {
        await get().fetchRecurring(true);
        set({ bulkLoading: false });
        return { refreshError: null };
      } catch (err: unknown) {
        const refreshError =
          getErrorMessage(err) ??
          "Failed to refresh recurring transactions";
        set({ bulkLoading: false });
        return { refreshError };
      }
    },
    setSorting: (field: string) => {
      const { sorting } = get();
      const newDirection =
        sorting.field === field && sorting.direction === "asc" ? "desc" : "asc";
      set({ sorting: { field, direction: newDirection } });
    },
    setFilters: (newFilters: Partial<RecurringTableFilters>) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
      }));
    },
    resetFilters: () => {
      set({ filters: initialFilters });
    },
    resetStore: () => {
      fetchGeneration += 1;
      set({
        recurring: [],
        loading: false,
        error: null,
        bulkLoading: false,
        bulkError: null,
        sorting: initialSortConfig,
        filters: initialFilters,
      });
    },
  })
);
