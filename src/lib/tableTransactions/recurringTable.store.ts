import { create } from "zustand";
import { RecurringTransaction } from "@/types/transaction";
import {
  deleteRecurringBulk,
  fetchAllRecurring,
  updateRecurringBulk,
} from "./recurringTable.service";
import type { RecurringBulkChange } from "./bulkActions";

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

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
  fetchRecurring: () => Promise<void>;
  deleteRecurringBulk: (ids: readonly string[]) => Promise<void>;
  updateRecurringBulk: (
    ids: readonly string[],
    change: RecurringBulkChange
  ) => Promise<void>;
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

export const useRecurringTableStore = create<RecurringTableState>()(
  (set, get) => ({
    recurring: [],
    loading: false,
    error: null,
    bulkLoading: false,
    bulkError: null,
    sorting: initialSortConfig,
    filters: initialFilters,
    fetchRecurring: async () => {
      set({ loading: true, error: null });
      try {
        const { sorting, filters } = get();
        const data = await fetchAllRecurring(sorting, filters);
        set({ recurring: data, loading: false });
      } catch (err: unknown) {
        set({
          error: getErrorMessage(
            err,
            "Failed to fetch recurring transactions"
          ),
          loading: false,
        });
      }
    },
    deleteRecurringBulk: async (ids) => {
      if (get().bulkLoading) {
        throw new Error("Bulk action already in progress");
      }

      set({ bulkLoading: true, bulkError: null });
      try {
        await deleteRecurringBulk(ids);
        await get().fetchRecurring();
        set({ bulkLoading: false });
      } catch (err: unknown) {
        const message = getErrorMessage(
          err,
          "Failed to delete recurring transactions"
        );
        set({ bulkError: message, bulkLoading: false });
        throw err;
      }
    },
    updateRecurringBulk: async (ids, change) => {
      if (get().bulkLoading) {
        throw new Error("Bulk action already in progress");
      }

      set({ bulkLoading: true, bulkError: null });
      try {
        await updateRecurringBulk(ids, change);
        set({ bulkLoading: false });
      } catch (err: unknown) {
        const message = getErrorMessage(
          err,
          "Failed to update recurring transactions"
        );
        set({ bulkError: message, bulkLoading: false });
        throw err;
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
