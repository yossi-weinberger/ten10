export interface ImportProgress {
  current: number;
  total: number;
}

/** Replace: clear existing data then import. Merge: append imported rows without clearing. */
export type ImportMode = "replace" | "merge";

export type DuplicateImportDecision = "skip" | "import_all" | "cancel";

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
  /**
   * Optional: user chooses how to handle duplicate-looking transactions during merge.
   * Resolve with `skip` to import only unique rows, `import_all` to keep all rows, or
   * `cancel` to abort before any writes.
   */
  onDuplicatesFound?: (counts: {
    duplicates: number;
    unique: number;
    total: number;
  }) => Promise<DuplicateImportDecision>;
}

export interface ExportFiltersPayload {
  search?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  types?: string[] | null;
  payment_methods?: string[] | null;
}
