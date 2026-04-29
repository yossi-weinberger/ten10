export interface ImportProgress {
  current: number;
  total: number;
}

/** Replace: clear existing data then import. Merge: append imported rows without clearing. */
export type ImportMode = "replace" | "merge";

export interface DataManagementOptions {
  setIsLoading: (loading: boolean) => void;
  /** Optional progress callback for import: (current, total) */
  onImportProgress?: (current: number, total: number) => void;
  /**
   * Optional: user confirms import and chooses mode.
   * Resolve with `ImportMode` to proceed, or `null` if cancelled.
   * If omitted, falls back to `window.confirm` (replace-only legacy text).
   */
  onConfirmNeeded?: (counts: {
    transactions: number;
    recurring: number;
  }) => Promise<ImportMode | null>;
}

export interface ExportFiltersPayload {
  search?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  types?: string[] | null;
  payment_methods?: string[] | null;
}
