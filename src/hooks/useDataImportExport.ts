import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  exportDataDesktop,
  exportDataWeb,
  importDataDesktop,
  importDataWeb,
} from "@/lib/data-layer/dataManagement.service";

export interface ImportConfirmDialogState {
  open: boolean;
  transactions: number;
  recurring: number;
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

  // Ref for the confirm promise
  const importConfirmResolveRef = useRef<((value: boolean) => void) | null>(
    null
  );

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
      return new Promise<boolean>((resolve) => {
        importConfirmResolveRef.current = resolve;
        setImportConfirmDialog({
          open: true,
          transactions: counts.transactions,
          recurring: counts.recurring,
        });
        setImportCounts(counts);
      });
    },
    []
  );

  // Dialog Action: User Clicked Confirm
  const handleImportConfirm = useCallback(() => {
    const resolve = importConfirmResolveRef.current;
    importConfirmResolveRef.current = null;
    setImportConfirmDialog(null);
    resolve?.(true);
  }, []);

  // Dialog Action: User Clicked Cancel (or closed dialog)
  const handleImportCancel = useCallback((open: boolean) => {
    if (!open) {
      const resolve = importConfirmResolveRef.current;
      importConfirmResolveRef.current = null;
      setImportConfirmDialog(null);
      resolve?.(false);
    }
  }, []);

  const handleImportData = async () => {
    setImportProgress(null);
    setImportCounts(null); // Reset previous counts

    const options = {
      setIsLoading: setIsImporting,
      onImportProgress: (current: number, total: number) =>
        setImportProgress({ current, total }),
      onConfirmNeeded: onImportConfirmNeeded,
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
    
    // Actions
    handleExportData,
    handleImportData,
    handleImportConfirm,
    handleImportCancel,
  };
}
