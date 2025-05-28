import { Transaction } from "./transaction";

export interface TableTransactionFilters {
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  types: string[]; // Array of TransactionType strings
  search: string; // For category, description, or recipient
}

export interface TableSortConfig {
  field: keyof Transaction | string; // Allow string for flexibility with potential custom sort fields
  direction: "asc" | "desc";
}

export interface TablePaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalCount: number;
  hasMore: boolean;
}

// Default initial values
export const initialTableTransactionFilters: TableTransactionFilters = {
  dateRange: { from: null, to: null },
  types: [],
  search: "",
};

export const initialTableSortConfig: TableSortConfig = {
  field: "date", // Default sort field
  direction: "desc", // Default sort direction
};

export const initialTablePaginationState: TablePaginationState = {
  currentPage: 1,
  itemsPerPage: 20, // As per guide
  totalCount: 0,
  hasMore: true, // Assume more initially
};
