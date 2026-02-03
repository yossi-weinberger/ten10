import { RecurringTransaction, Transaction } from "@/types/transaction";
import { useDonationStore } from "../store";
import toast from "react-hot-toast";
import { nanoid } from "nanoid";
import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";
import { clearAllData as clearAllDataFromDataService } from "./index";
import { logger } from "@/lib/logger";
import i18n from "../i18n";
import {
  RECURRING_CAMEL_TO_SNAKE,
  RECURRING_KEYS_TO_DROP_ON_INSERT,
  TRANSACTION_CAMEL_TO_SNAKE,
  TRANSACTION_KEYS_TO_DROP_ON_INSERT,
  normalizeKeysToSnake,
} from "./fieldMapping";
import { ImportFileSchema } from "./importSchemas";

export interface ImportProgress {
  current: number;
  total: number;
}

interface DataManagementOptions {
  setIsLoading: (loading: boolean) => void;
  /** Optional progress callback for import: (current, total) */
  onImportProgress?: (current: number, total: number) => void;
  /** Optional: return Promise<boolean> for confirm; if not provided, falls back to window.confirm */
  onConfirmNeeded?: (counts: {
    transactions: number;
    recurring: number;
  }) => Promise<boolean>;
}

interface ExportFiltersPayload {
  search?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  types?: string[] | null;
}

/**
 * Normalize a transaction from an export file for Supabase insert.
 * Uses central field mapping (fieldMapping.ts): camelCase -> snake_case and keys to drop.
 * source_recurring_id comes from param (new recurring id from import), not from file.
 */
function normalizeTransactionRowForSupabase(
  transaction: Record<string, unknown>,
  user_id: string,
  source_recurring_id: string | null
): Record<string, unknown> {
  return normalizeKeysToSnake(
    { ...transaction, user_id, source_recurring_id },
    TRANSACTION_CAMEL_TO_SNAKE,
    TRANSACTION_KEYS_TO_DROP_ON_INSERT
  );
}

function parseImportFile(raw: string): {
  transactions: Transaction[];
  recurring: RecurringTransaction[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logger.error("Import file JSON parse error:", error);
    throw new Error("invalid_json");
  }

  const result = ImportFileSchema.safeParse(parsed);
  if (!result.success) {
    logger.error("Import file schema validation error:", result.error);
    const err = new Error("invalid_structure");
    (err as Error & { zodError?: unknown }).zodError = result.error;
    throw err;
  }

  return {
    transactions: result.data.transactions as unknown as Transaction[],
    recurring: result.data
      .recurring_transactions as unknown as RecurringTransaction[],
  };
}

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

export async function clearAllData() {
  const currentPlatform = getPlatform();
  logger.log(
    "DataManagementService: Clearing all data. Platform:",
    currentPlatform
  );
  if (currentPlatform === "desktop") {
    try {
      logger.log("Invoking clear_all_data...");
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("clear_all_data");
      logger.log("SQLite data cleared successfully via invoke.");
    } catch (error) {
      logger.error("Error invoking clear_all_data:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const { error } = await supabase.rpc("clear_all_user_data");

      if (error) {
        logger.error("Error calling clear_all_user_data RPC:", error);
        throw error;
      }

      logger.log("Successfully cleared user data via RPC.");
    } catch (error) {
      logger.error("Error clearing Supabase data:", error);
      throw error; // Re-throw the error to be caught by the calling function
    }
  }

  logger.log("Clearing Zustand store...");
  // After clearing data, we need to signal that any cached data is now stale.
  // Setting the fetch timestamp to a new value will trigger data re-fetching
  // in components that depend on it.
  useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
  logger.log("Zustand store updated to reflect data changes.");
}

async function fetchAllTransactionsForExportWeb(): Promise<Transaction[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    logger.error("Web Export: User not authenticated.");
    throw new Error("User not authenticated for web export.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*, recurring_transactions(*)")
    .order("date", { ascending: false });

  if (error) {
    logger.error("Web Export: Supabase select error:", error);
    throw error;
  }

  return (data || []).map((t_db: any) => {
    const recurring_info = t_db.recurring_transactions;
    delete t_db.recurring_transactions;

    const transaction: Transaction = {
      ...t_db,
      recurring_info: recurring_info || undefined,
    };
    return transaction;
  });
}

async function fetchAllRecurringTransactionsForExportWeb(): Promise<
  RecurringTransaction[]
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    logger.error("Web Export: User not authenticated.");
    return [];
  }

  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .order("next_due_date", { ascending: true });

  if (error) {
    logger.error("Web Export: Supabase recurring select error:", error);
    throw error;
  }

  return data || [];
}

export const exportDataWeb = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    const transactions = await fetchAllTransactionsForExportWeb();
    const recurring = await fetchAllRecurringTransactionsForExportWeb();

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
    const dateString = new Date().toISOString().split("T")[0];
    const suggestedFilename = `ten10_backup_web_${dateString}.json`;

    const blob = new Blob([jsonData], { type: "application/json" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = suggestedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(link.href);

    toast.success(i18n.t("settings:messages.exportSuccess"));
  } catch (error) {
    logger.error("Failed to export data (web):", error);
    if (error instanceof Error) {
      toast.error(
        i18n.t("settings:messages.exportError") + ": " + error.message
      );
    } else {
      toast.error(i18n.t("settings:messages.exportError"));
    }
  } finally {
    setIsLoading(false);
  }
};

export const importDataWeb = async ({
  setIsLoading,
  onImportProgress,
  onConfirmNeeded,
}: DataManagementOptions): Promise<void> => {
  let fileWasSelected = false;
  let cancelCheckTimeout: ReturnType<typeof setTimeout> | null = null;
  let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;
  const clearCancelListener = () => {
    window.removeEventListener("focus", onFocusAfterDialog);
    if (cancelCheckTimeout !== null) {
      clearTimeout(cancelCheckTimeout);
      cancelCheckTimeout = null;
    }
    if (fallbackTimeout !== null) {
      clearTimeout(fallbackTimeout);
      fallbackTimeout = null;
    }
  };
  const onFocusAfterDialog = () => {
    window.removeEventListener("focus", onFocusAfterDialog);
    cancelCheckTimeout = setTimeout(() => {
      cancelCheckTimeout = null;
      if (!fileWasSelected) {
        setIsLoading(false);
      }
    }, 500);
  };
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (event) => {
      fileWasSelected = true;
      clearCancelListener();
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        toast.error(i18n.t("settings:messages.noFileSelected"));
        setIsLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContents = e.target?.result as string;
          let payload: {
            transactions: Transaction[];
            recurring: RecurringTransaction[];
          } | null = null;

          try {
            payload = parseImportFile(fileContents);
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "invalid_structure"
            ) {
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

          if (
            transactionsToImport.length === 0 &&
            recurringToImport.length === 0
          ) {
            toast(i18n.t("settings:messages.emptyFile"));
            setIsLoading(false);
            return;
          }

          const confirmed = onConfirmNeeded
            ? await onConfirmNeeded({
                transactions: transactionsToImport.length,
                recurring: recurringToImport.length,
              })
            : window.confirm(i18n.t("settings:messages.importConfirmWeb"));

          if (!confirmed) {
            toast.error(i18n.t("settings:messages.importCancelled"));
            setIsLoading(false);
            return;
          }

          setIsLoading(true);
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated for web import.");

          await clearAllDataFromDataService();
          // Currency lock state is automatically updated via store changes (lastDbFetchTimestamp)

          const recurringIdMap = new Map<string, string>();
          const total = transactionsToImport.length;

          if (recurringToImport.length > 0) {
            for (const rec of recurringToImport) {
              const oldId = (rec as any).id as string | undefined;
              const normalized = normalizeKeysToSnake(
                rec as unknown as Record<string, unknown>,
                RECURRING_CAMEL_TO_SNAKE,
                RECURRING_KEYS_TO_DROP_ON_INSERT
              );
              const { data: newDefinition, error: definitionError } =
                await supabase
                  .from("recurring_transactions")
                  .insert({ ...normalized, user_id: user.id })
                  .select("id")
                  .single();

              if (definitionError) {
                logger.error(
                  "Error creating recurring definition (web import):",
                  definitionError
                );
                throw definitionError;
              }
              if (oldId && newDefinition?.id) {
                recurringIdMap.set(oldId, newDefinition.id);
              }
            }
          }

          // Pass 1: Create recurring definitions and build map; prepare all transaction rows for bulk insert
          const transactionRows: Record<string, unknown>[] = [];
          for (let i = 0; i < total; i++) {
            const item = transactionsToImport[i];
            const transaction = (item as any).transaction || item;
            const recurringInfo = (item as any).recurring_info;
            const oldRecurringId =
              (transaction as any).source_recurring_id ?? recurringInfo?.id;

            let webSourceRecurringId: string | undefined = undefined;

            if (oldRecurringId && recurringIdMap.has(oldRecurringId)) {
              webSourceRecurringId = recurringIdMap.get(oldRecurringId);
            } else if (recurringInfo && oldRecurringId) {
              const {
                status,
                frequency,
                execution_count,
                total_occurrences,
                day_of_month,
                start_date,
                next_due_date,
              } = normalizeKeysToSnake(
                recurringInfo as unknown as Record<string, unknown>,
                RECURRING_CAMEL_TO_SNAKE,
                RECURRING_KEYS_TO_DROP_ON_INSERT
              ) as {
                status?: string;
                frequency?: string;
                execution_count?: number;
                total_occurrences?: number | null;
                day_of_month?: number | null;
                start_date?: string | null;
                next_due_date?: string | null;
              };

              const normalizedTransaction = normalizeKeysToSnake(
                transaction as Record<string, unknown>,
                TRANSACTION_CAMEL_TO_SNAKE,
                []
              ) as Record<string, unknown>;

              const {
                description,
                amount,
                currency,
                type,
                category,
                is_chomesh,
                recipient,
                original_amount,
                original_currency,
                conversion_rate,
                conversion_date,
                rate_source,
              } = normalizedTransaction as {
                description?: string;
                amount?: number;
                currency?: string;
                type?: string;
                category?: string;
                is_chomesh?: boolean;
                recipient?: string | null;
                original_amount?: number | null;
                original_currency?: string | null;
                conversion_rate?: number | null;
                conversion_date?: string | null;
                rate_source?: string | null;
              };

              const definitionToInsert = {
                user_id: user.id,
                status,
                frequency,
                execution_count,
                total_occurrences,
                day_of_month,
                start_date,
                next_due_date,
                description,
                amount,
                currency,
                type,
                category,
                is_chomesh,
                recipient,
                original_amount,
                original_currency,
                conversion_rate,
                conversion_date,
                rate_source,
              };

              const { data: newDefinition, error: definitionError } =
                await supabase
                  .from("recurring_transactions")
                  .insert(definitionToInsert)
                  .select("id")
                  .single();

              if (definitionError) {
                logger.error(
                  "Error creating recurring definition for",
                  oldRecurringId,
                  definitionError
                );
                throw definitionError;
              } else if (newDefinition) {
                webSourceRecurringId = newDefinition.id;
                recurringIdMap.set(oldRecurringId, newDefinition.id);
              }
            }

            const row = normalizeTransactionRowForSupabase(
              transaction as Record<string, unknown>,
              user.id,
              webSourceRecurringId ?? null
            );
            transactionRows.push(row);
            onImportProgress?.(i + 1, total);
          }

          // Pass 2: Bulk insert transactions in batches (much faster than one-by-one)
          const BATCH_SIZE = 100;
          let importCount = 0;
          for (
            let offset = 0;
            offset < transactionRows.length;
            offset += BATCH_SIZE
          ) {
            const batch = transactionRows.slice(offset, offset + BATCH_SIZE);
            const { error: batchError } = await supabase
              .from("transactions")
              .insert(batch);

            if (batchError) {
              logger.error(
                "Error bulk inserting transactions (web):",
                batchError
              );
              throw batchError;
            }
            importCount += batch.length;
          }
          onImportProgress?.(total, total);

          useDonationStore.getState().setLastDbFetchTimestamp(Date.now());

          toast.success(
            i18n.t("settings:messages.importSuccessWithCountWeb", {
              count: importCount,
              total: transactionsToImport.length,
            })
          );
        } catch (importError) {
          logger.error(
            "Failed to import data (web) during processing:",
            importError
          );
          if (importError instanceof Error) {
            toast.error(
              i18n.t("settings:messages.importError") +
                ": " +
                importError.message
            );
          } else {
            toast.error(i18n.t("settings:messages.unknownImportError"));
          }
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error(i18n.t("settings:messages.fileReadError"));
        setIsLoading(false);
      };

      reader.readAsText(file);
    };

    input.click();
    setTimeout(() => {
      window.addEventListener("focus", onFocusAfterDialog);
      // Fallback: if user never returns focus (e.g. switched app), clear loading after 2 min
      fallbackTimeout = setTimeout(() => {
        fallbackTimeout = null;
        if (!fileWasSelected) {
          clearCancelListener();
          setIsLoading(false);
        }
      }, 120_000);
    }, 200);
  } catch (error) {
    logger.error("Failed to initiate import data (web):", error);
    toast.error(i18n.t("settings:messages.importInitError"));
    clearCancelListener();
    setIsLoading(false);
  }
};
