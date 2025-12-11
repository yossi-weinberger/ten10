import { create } from "zustand";
import { RecurringTransaction } from "@/types/transaction";
import { fetchAllRecurring } from "./recurringTable.service";

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
  sorting: RecurringTableSortConfig;
  filters: RecurringTableFilters;
  fetchRecurring: () => Promise<void>;
  setSorting: (field: string) => void;
  setFilters: (newFilters: Partial<RecurringTableFilters>) => void;
  resetFilters: () => void;
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
    sorting: initialSortConfig,
    filters: initialFilters,
    fetchRecurring: async () => {
      set({ loading: true, error: null });
      try {
        const { sorting, filters } = get();
        const data = await fetchAllRecurring(sorting, filters);
        set({ recurring: data, loading: false });
      } catch (err: any) {
        set({
          error: err.message || "Failed to fetch recurring transactions",
          loading: false,
        });
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
  })
);
