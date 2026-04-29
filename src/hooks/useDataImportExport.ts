import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  type DuplicateImportDecision,
  type ImportMode,
  exportDataDesktop,
  exportDataWeb,
  importDataDesktop,
  importDataWeb,
} from "@/lib/data-layer/dataManagement.service";

export interface ImportConfirmDialogState {
  transactions: number;
  recurring: number;
  /** Increments on each open so the modal remounts even when counts match the previous import */
  nonce: number;
}

export interface ImportDuplicatesDialogState {
  duplicates: number;
  unique: number;
  total: number;
  /** Increments on each open so the modal remounts even when counts match the previous import */
  nonce: number;
}

export function useDataImportExport() {
  const { t: tCommon } = useTranslation("common");
  const { platform } = usePlatform();

  // State
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [importCounts, setImportCounts] = useState<{
    transactions: number;
    recurring: number;
  } | null>(null);
  const [importConfirmDialog, setImportConfirmDialog] =
    useState<ImportConfirmDialogState | null>(null);
  const [importDuplicatesDialog, setImportDuplicatesDialog] =
    useState<ImportDuplicatesDialogState | null>(null);

  // Ref for the confirm promise (ImportMode to proceed, null = cancelled)
  const importConfirmResolveRef = useRef<
    ((value: ImportMode | null) => void) | null
  >(null);
  const importDuplicatesResolveRef = useRef<
    ((value: DuplicateImportDecision) => void) | null
  >(null);
  const importConfirmNonceRef = useRef(0);
  const importDuplicatesNonceRef = useRef(0);

  // --- Export Logic ---
  const handleExportData = async () => {
    if (platform === "desktop") {
      await exportDataDesktop({ setIsLoading: setIsExporting });
    } else if (platform === "web") {
      await exportDataWeb({ setIsLoading: setIsExporting });
    } else {
      toast.error(tCommon("toast.settings.exportError"));
    }
  };

  // --- Import Logic ---

  // Callback passed to the service: shows dialog and waits for user input
  const onImportConfirmNeeded = useCallback(
    (counts: { transactions: number; recurring: number }) => {
      return new Promise<ImportMode | null>((resolve) => {
        importConfirmResolveRef.current = resolve;
        importConfirmNonceRef.current += 1;
        setImportConfirmDialog({
          transactions: counts.transactions,
          recurring: counts.recurring,
          nonce: importConfirmNonceRef.current,
        });
        setImportCounts(counts);
      });
    },
    []
  );

  const onDuplicatesFound = useCallback(
    (counts: { duplicates: number; unique: number; total: number }) => {
      return new Promise<DuplicateImportDecision>((resolve) => {
        importDuplicatesResolveRef.current = resolve;
        importDuplicatesNonceRef.current += 1;
        setImportDuplicatesDialog({
          duplicates: counts.duplicates,
          unique: counts.unique,
          total: counts.total,
          nonce: importDuplicatesNonceRef.current,
        });
      });
    },
    []
  );

  // Dialog Action: User confirmed with chosen import mode
  const handleImportConfirm = useCallback((mode: ImportMode) => {
    const resolve = importConfirmResolveRef.current;
    importConfirmResolveRef.current = null;
    setImportConfirmDialog(null);
    resolve?.(mode);
  }, []);

  // Dialog Action: User Clicked Cancel (or closed dialog)
  const handleImportCancel = useCallback((open: boolean) => {
    if (!open) {
      const resolve = importConfirmResolveRef.current;
      importConfirmResolveRef.current = null;
      setImportConfirmDialog(null);
      resolve?.(null);
    }
  }, []);

  const handleDuplicatesDecision = useCallback(
    (decision: DuplicateImportDecision) => {
      const resolve = importDuplicatesResolveRef.current;
      importDuplicatesResolveRef.current = null;
      setImportDuplicatesDialog(null);
      resolve?.(decision);
    },
    []
  );

  const handleImportData = async () => {
    setImportProgress(null);
    setImportCounts(null); // Reset previous counts

    const options = {
      setIsLoading: setIsImporting,
      onImportProgress: (current: number, total: number) =>
        setImportProgress({ current, total }),
      onConfirmNeeded: onImportConfirmNeeded,
      onDuplicatesFound,
    };

    if (platform === "desktop") {
      await importDataDesktop(options);
    } else if (platform === "web") {
      await importDataWeb(options);
    } else {
      toast.error(tCommon("toast.settings.importError"));
    }
    
    // Cleanup after finish
    setImportProgress(null);
    setImportCounts(null);
  };

  return {
    // State
    isExporting,
    isImporting,
    importProgress,
    importCounts,
    importConfirmDialog,
    importDuplicatesDialog,
    
    // Actions
    handleExportData,
    handleImportData,
    handleImportConfirm,
    handleImportCancel,
    handleDuplicatesDecision,
  };
}
