import { RecurringTransaction, Transaction } from "@/types/transaction";
import { useDonationStore } from "../../store";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import i18n from "../../i18n";
import {
  RECURRING_CAMEL_TO_SNAKE,
  RECURRING_KEYS_TO_DROP_ON_INSERT,
  TRANSACTION_CAMEL_TO_SNAKE,
  normalizeKeysToSnake,
} from "../fieldMapping";
import type { DataManagementOptions } from "./types";
import {
  parseImportFile,
  normalizeTransactionRowForSupabase,
} from "./importParse";
import { clearAllData } from "./clear";

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

          await clearAllData();
          // Currency lock state is automatically updated via store changes (lastDbFetchTimestamp)

          const recurringIdMap = new Map<string, string>();
          const total = transactionsToImport.length;
          const totalProgressSteps = total * 2;

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
            if (totalProgressSteps > 0) {
              onImportProgress?.(i + 1, totalProgressSteps);
            }
          }

          // Pass 2: Bulk insert transactions in batches (much faster than one-by-one)
          const BATCH_SIZE = 100;
          let importCount = 0;
          let progressSoFar = total;
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
            progressSoFar += batch.length;
            if (totalProgressSteps > 0) {
              onImportProgress?.(
                Math.min(progressSoFar, totalProgressSteps),
                totalProgressSteps
              );
            }
          }

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
