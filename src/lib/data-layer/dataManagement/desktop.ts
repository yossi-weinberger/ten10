import { RecurringTransaction, Transaction } from "@/types/transaction";
import { useDonationStore } from "../../store";
import toast from "react-hot-toast";
import { nanoid } from "nanoid";
import { logger } from "@/lib/logger";
import i18n from "../../i18n";
import {
  RECURRING_CAMEL_TO_SNAKE,
  RECURRING_KEYS_TO_DROP_ON_INSERT,
  normalizeKeysToSnake,
} from "../fieldMapping";
import type {
  DataManagementOptions,
  ExportFiltersPayload,
  ImportMode,
} from "./types";
import {
  tryParseImportFileContents,
  isImportPayloadEmpty,
  getDesktopImportProgressTotal,
  unpackImportTransactionItem,
  filterDuplicateImportTransactions,
} from "./importPrepare";

async function fetchAllTransactionsForExportDesktop(): Promise<Transaction[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  const emptyFilters: ExportFiltersPayload = {};
  const transactions = await invoke<Transaction[]>(
    "export_transactions_handler",
    { filters: emptyFilters }
  );
  return transactions || [];
}

async function fetchExistingTransactionsForDedupe(): Promise<Transaction[]> {
  return fetchAllTransactionsForExportDesktop();
}

async function fetchAllRecurringTransactionsForExportDesktop(): Promise<
  RecurringTransaction[]
> {
  const { invoke } = await import("@tauri-apps/api/core");
  const payload = {
    sorting: { field: "next_due_date", direction: "asc" },
    filters: {
      search: null,
      statuses: null,
      types: null,
      date_from: null,
      date_to: null,
      frequencies: null,
    },
  };
  const recurring = await invoke<RecurringTransaction[]>(
    "get_recurring_transactions_handler",
    { args: payload }
  );
  return recurring || [];
}

export const exportDataDesktop = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    // Dynamic imports for Tauri modules
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    const transactions = await fetchAllTransactionsForExportDesktop();
    const recurring = await fetchAllRecurringTransactionsForExportDesktop();

    if (
      (!transactions || transactions.length === 0) &&
      (!recurring || recurring.length === 0)
    ) {
      toast.error(i18n.t("settings:messages.noDataToExport"));
      setIsLoading(false);
      return;
    }

    const exportPayload = {
      version: 2,
      transactions: transactions || [],
      recurring_transactions: recurring || [],
    };
    const jsonData = JSON.stringify(exportPayload, null, 2);
    const suggestedFilename = `ten10_backup_desktop_${
      new Date().toISOString().split("T")[0]
    }.json`;

    const filePath = await save({
      title: i18n.t("settings:importExport.exportTitle") + " (Desktop)",
      defaultPath: suggestedFilename,
      filters: [
        {
          name: "JSON Files",
          extensions: ["json"],
        },
      ],
    });

    if (filePath) {
      await writeTextFile(filePath, jsonData);
      toast.success(i18n.t("settings:messages.exportSuccess"));
    } else {
      logger.log("Desktop data export cancelled by user.");
    }
  } catch (error) {
    logger.error("Failed to export data (desktop):", error);
    toast.error(i18n.t("settings:messages.exportError"));
  } finally {
    setIsLoading(false);
  }
};

export const importDataDesktop = async ({
  setIsLoading,
  onImportProgress,
  onConfirmNeeded,
  onDuplicatesFound,
}: DataManagementOptions): Promise<void> => {
  try {
    // Dynamic imports for Tauri modules
    const { invoke } = await import("@tauri-apps/api/core");
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");

    // Open file picker first; only show full-screen loader after user selects file and confirms
    const selectedPath = await open({
      title: i18n.t("settings:messages.selectFileTitle"),
      multiple: false,
      filters: [
        {
          name: "JSON Files",
          extensions: ["json"],
        },
      ],
    });

    if (selectedPath && typeof selectedPath === "string") {
      const fileContents = await readTextFile(selectedPath);
      const parsed = tryParseImportFileContents(fileContents);
      if (!parsed.ok) {
        toast.error(
          i18n.t(
            parsed.error === "invalid_structure"
              ? "settings:messages.invalidStructure"
              : "settings:messages.invalidJson"
          )
        );
        setIsLoading(false);
        return;
      }

      const {
        transactions: transactionsToImport,
        recurring: recurringToImport,
      } = parsed;

      if (isImportPayloadEmpty(transactionsToImport, recurringToImport)) {
        toast(i18n.t("settings:messages.emptyFile"));
        setIsLoading(false);
        return;
      }

      const importMode: ImportMode | null = onConfirmNeeded
        ? await onConfirmNeeded({
            transactions: transactionsToImport.length,
            recurring: recurringToImport.length,
          })
        : window.confirm(i18n.t("settings:messages.importConfirm"))
          ? "replace"
          : null;

      if (!importMode) {
        toast.error(i18n.t("settings:messages.importCancelled"));
        return;
      }

      setIsLoading(true);

      let activeTransactionsToImport = transactionsToImport;
      let skippedDuplicateCount = 0;

      if (importMode === "merge" && onDuplicatesFound) {
        const existingTransactions = await fetchExistingTransactionsForDedupe();
        const duplicateResult = filterDuplicateImportTransactions(
          transactionsToImport,
          existingTransactions
        );

        if (duplicateResult.duplicates.length > 0) {
          const duplicateDecision = await onDuplicatesFound({
            duplicates: duplicateResult.duplicates.length,
            unique: duplicateResult.unique.length,
            total: transactionsToImport.length,
          });

          if (duplicateDecision === "cancel") {
            toast.error(i18n.t("settings:messages.importCancelled"));
            return;
          }

          if (duplicateDecision === "skip") {
            activeTransactionsToImport = duplicateResult.unique;
            skippedDuplicateCount = duplicateResult.duplicates.length;
          }
        }
      }

      const totalProgressSteps = getDesktopImportProgressTotal(
        recurringToImport.length,
        activeTransactionsToImport.length
      );
      let progressStep = 0;
      const reportProgress = () => {
        if (totalProgressSteps > 0) {
          progressStep = Math.min(progressStep + 1, totalProgressSteps);
          onImportProgress?.(progressStep, totalProgressSteps);
        }
      };

      const recurringIdMap = new Map<string, string>();
      const recurringPayload: RecurringTransaction[] = [];

      if (recurringToImport.length > 0) {
        for (const rec of recurringToImport) {
          const oldId = rec.id;
          const normalized = normalizeKeysToSnake(
            rec as unknown as Record<string, unknown>,
            RECURRING_CAMEL_TO_SNAKE,
            RECURRING_KEYS_TO_DROP_ON_INSERT
          );
          const newDesktopId = nanoid();
          const definitionToInsert = {
            ...normalized,
            id: newDesktopId,
            user_id: undefined,
          };
          recurringPayload.push(
            definitionToInsert as unknown as RecurringTransaction
          );
          if (oldId) {
            recurringIdMap.set(oldId, newDesktopId);
          }
          reportProgress();
        }
      }

      const total = activeTransactionsToImport.length;
      const transactionsPayload: Transaction[] = [];

      for (let i = 0; i < total; i++) {
        const item = activeTransactionsToImport[i];
        try {
          const { transaction, recurringInfo, oldRecurringId } =
            unpackImportTransactionItem(item);

          let desktopSourceRecurringId: string | undefined = undefined;

          if (oldRecurringId && recurringIdMap.has(oldRecurringId)) {
            desktopSourceRecurringId = recurringIdMap.get(oldRecurringId);
          } else if (recurringInfo && oldRecurringId) {
            const newDesktopId = nanoid();
            const definitionToInsert = {
              ...transaction,
              ...recurringInfo,
              id: newDesktopId,
              user_id: undefined,
            };

            recurringPayload.push(
              definitionToInsert as unknown as RecurringTransaction
            );

            desktopSourceRecurringId = newDesktopId;
            recurringIdMap.set(oldRecurringId, newDesktopId);
          }

          const transactionForRust = {
            ...transaction,
            id: nanoid(),
            source_recurring_id: desktopSourceRecurringId,
          } as unknown as Transaction;

          transactionsPayload.push(transactionForRust);
          reportProgress();
        } catch (error) {
          logger.error("Error processing imported item:", item, error);
          throw error;
        }
      }

      const importCount = transactionsPayload.length;

      await invoke("import_desktop_data_bulk", {
        mode: importMode,
        recurring: recurringPayload,
        transactions: transactionsPayload,
      });

      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());

      if (importMode === "merge") {
        if (skippedDuplicateCount > 0) {
          toast.success(
            i18n.t("settings:messages.importSuccessMergeSkippedWithCount", {
              count: importCount,
              skipped: skippedDuplicateCount,
            })
          );
        } else {
          toast.success(
            i18n.t("settings:messages.importSuccessMergeWithCount", {
              count: importCount,
            })
          );
        }
      } else {
        toast.success(
          i18n.t("settings:messages.importSuccessWithCount", {
            count: importCount,
          })
        );
      }
    } else {
      // User cancelled file picker or no path selected
      if (selectedPath !== null) {
        logger.warn(
          "File selection returned an array or unexpected type:",
          selectedPath
        );
      }
      setIsLoading(false);
      return;
    }
  } catch (error) {
    logger.error("Failed to import data (desktop):", error);
    toast.error(i18n.t("settings:messages.importError"));
  } finally {
    setIsLoading(false);
  }
};
