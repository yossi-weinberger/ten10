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
import type { DataManagementOptions, ExportFiltersPayload } from "./types";
import { parseImportFile } from "./importParse";

async function fetchAllTransactionsForExportDesktop(): Promise<Transaction[]> {
  const { invoke } = await import("@tauri-apps/api/core");
  const emptyFilters: ExportFiltersPayload = {};
  const transactions = await invoke<Transaction[]>(
    "export_transactions_handler",
    { filters: emptyFilters }
  );
  return transactions || [];
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
      let payload: {
        transactions: Transaction[];
        recurring: RecurringTransaction[];
      } | null = null;

      try {
        payload = parseImportFile(fileContents);
      } catch (error) {
        if (error instanceof Error && error.message === "invalid_structure") {
          toast.error(i18n.t("settings:messages.invalidStructure"));
        } else {
          toast.error(i18n.t("settings:messages.invalidJson"));
        }
        setIsLoading(false);
        return;
      }

      if (!payload) {
        toast.error(i18n.t("settings:messages.invalidStructure"));
        setIsLoading(false);
        return;
      }

      const {
        transactions: transactionsToImport,
        recurring: recurringToImport,
      } = payload;

      if (transactionsToImport.length === 0 && recurringToImport.length === 0) {
        toast(i18n.t("settings:messages.emptyFile"));
        setIsLoading(false);
        return;
      }

      const confirmed = onConfirmNeeded
        ? await onConfirmNeeded({
            transactions: transactionsToImport.length,
            recurring: recurringToImport.length,
          })
        : window.confirm(i18n.t("settings:messages.importConfirm"));

      if (!confirmed) {
        toast.error(i18n.t("settings:messages.importCancelled"));
        return;
      }

      setIsLoading(true);
      await invoke("clear_all_data");

      const recurringIdMap = new Map<string, string>();
      if (recurringToImport.length > 0) {
        for (const rec of recurringToImport) {
          const oldId = (rec as any).id as string | undefined;
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
          await invoke("add_recurring_transaction_handler", {
            recTransaction: definitionToInsert,
          });
          if (oldId) {
            recurringIdMap.set(oldId, newDesktopId);
          }
        }
      }
      const total = transactionsToImport.length;
      let importCount = 0;
      for (let i = 0; i < total; i++) {
        const item = transactionsToImport[i];
        try {
          // The item from web export can be a complex object
          const transaction = (item as any).transaction || item;
          const recurringInfo = (item as any).recurring_info;
          const oldRecurringId =
            (transaction as any).source_recurring_id ?? recurringInfo?.id;

          let desktopSourceRecurringId: string | undefined = undefined;

          if (oldRecurringId && recurringIdMap.has(oldRecurringId)) {
            desktopSourceRecurringId = recurringIdMap.get(oldRecurringId);
          } else if (recurringInfo && oldRecurringId) {
            // This is the first time we see this recurring definition.
            // We need to create it in the desktop DB.
            const newDesktopId = nanoid();
            const definitionToInsert = {
              // We construct a payload that matches what `add_recurring_transaction_handler` expects
              // It's based on the Transaction object itself, which holds the details
              ...transaction,
              ...recurringInfo,
              id: newDesktopId, // Let Rust generate a new ID
              user_id: undefined, // Not needed for desktop
            };

            await invoke("add_recurring_transaction_handler", {
              recTransaction: definitionToInsert,
            });

            desktopSourceRecurringId = newDesktopId;
            recurringIdMap.set(oldRecurringId, newDesktopId);
          }

          // Now, add the individual transaction, linking it to the new recurring ID if it exists
          const transactionForRust = {
            ...transaction,
            source_recurring_id: desktopSourceRecurringId,
          };

          await invoke("add_transaction", { transaction: transactionForRust });
          onImportProgress?.(i + 1, total);
          importCount += 1;
        } catch (error) {
          logger.error("Error processing imported item:", item, error);
          throw error;
        }
      }

      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());

      toast.success(
        i18n.t("settings:messages.importSuccessWithCount", {
          count: importCount,
        })
      );
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
