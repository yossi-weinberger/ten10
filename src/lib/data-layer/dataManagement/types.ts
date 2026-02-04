export interface ImportProgress {
  current: number;
  total: number;
}

export interface DataManagementOptions {
  setIsLoading: (loading: boolean) => void;
  /** Optional progress callback for import: (current, total) */
  onImportProgress?: (current: number, total: number) => void;
  /** Optional: return Promise<boolean> for confirm; if not provided, falls back to window.confirm */
  onConfirmNeeded?: (counts: {
    transactions: number;
    recurring: number;
  }) => Promise<boolean>;
}

export interface ExportFiltersPayload {
  search?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  types?: string[] | null;
}
