import { Transaction } from "@/types/transaction";
import { useDonationStore } from "../store";
import toast from "react-hot-toast";
import { nanoid } from "nanoid";
import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";
import {
  addTransaction,
  clearAllData as clearAllDataFromDataService,
} from "./index";

interface DataManagementOptions {
  setIsLoading: (loading: boolean) => void;
}

interface ExportFiltersPayload {
  search?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  types?: string[] | null;
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

export const exportDataDesktop = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    // Dynamic imports for Tauri modules
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    const transactions = await fetchAllTransactionsForExportDesktop();

    if (!transactions || transactions.length === 0) {
      toast.error("אין נתונים לייצא.");
      setIsLoading(false);
      return;
    }

    const jsonData = JSON.stringify(transactions, null, 2);
    const suggestedFilename = `ten10_backup_desktop_${
      new Date().toISOString().split("T")[0]
    }.json`;

    const filePath = await save({
      title: "שמור גיבוי נתונים (Desktop)",
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
      toast.success("הנתונים יוצאו בהצלחה!");
    } else {
      console.log("Desktop data export cancelled by user.");
    }
  } catch (error) {
    console.error("Failed to export data (desktop):", error);
    toast.error("שגיאה בייצוא הנתונים (Desktop).");
  } finally {
    setIsLoading(false);
  }
};

export const importDataDesktop = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    // Dynamic imports for Tauri modules
    const { invoke } = await import("@tauri-apps/api/core");
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readTextFile } = await import("@tauri-apps/plugin-fs");

    const selectedPath = await open({
      title: "בחר קובץ גיבוי לייבוא",
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
      let transactionsToImport: Transaction[];

      try {
        transactionsToImport = JSON.parse(fileContents) as Transaction[];
      } catch (e) {
        toast.error("קובץ לא תקין או שאינו בפורמט JSON.");
        setIsLoading(false);
        return;
      }

      if (
        !Array.isArray(transactionsToImport) ||
        transactionsToImport.some(
          (t) => typeof t.id === "undefined" || typeof t.amount === "undefined"
        )
      ) {
        toast.error("מבנה הנתונים בקובץ אינו תקין או חסרים שדות הכרחיים.");
        setIsLoading(false);
        return;
      }

      if (transactionsToImport.length === 0) {
        toast("הקובץ שנבחר אינו מכיל נתונים לייבוא.");
        setIsLoading(false);
        return;
      }

      const confirmed = window.confirm(
        "האם אתה בטוח שברצונך לייבא את הנתונים מקובץ זה? " +
          "פעולה זו תמחק את כל הנתונים הנוכחיים שלך ותחליף אותם בנתונים מהקובץ. " +
          "מומלץ לגבות את הנתונים הנוכחיים תחילה."
      );

      if (!confirmed) {
        toast.error("ייבוא הנתונים בוטל.");
        setIsLoading(false);
        return;
      }

      await invoke("clear_all_data");

      const recurringIdMap = new Map<string, string>();
      for (const item of transactionsToImport) {
        try {
          // The item from web export can be a complex object
          const transaction = (item as any).transaction || item;
          const recurringInfo = (item as any).recurring_info;
          const webSourceRecurringId = recurringInfo?.id;

          let desktopSourceRecurringId: string | undefined = undefined;

          if (recurringInfo && webSourceRecurringId) {
            if (recurringIdMap.has(webSourceRecurringId)) {
              desktopSourceRecurringId =
                recurringIdMap.get(webSourceRecurringId);
            } else {
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
              recurringIdMap.set(webSourceRecurringId, newDesktopId);
            }
          }

          // Now, add the individual transaction, linking it to the new recurring ID if it exists
          const transactionForRust = {
            ...transaction,
            source_recurring_id: desktopSourceRecurringId,
          };

          await invoke("add_transaction", { transaction: transactionForRust });
        } catch (error) {
          console.error("Error processing imported item:", item, error);
        }
      }

      useDonationStore.getState().setLastDbFetchTimestamp(Date.now());

      toast.success(
        `ייבוא הושלם! ${transactionsToImport.length} רשומות יובאו בהצלחה.`
      );
    } else {
      if (selectedPath !== null) {
        console.warn(
          "File selection returned an array or unexpected type:",
          selectedPath
        );
      }
    }
  } catch (error) {
    console.error("Failed to import data (desktop):", error);
    toast.error("שגיאה בייבוא הנתונים.");
  } finally {
    setIsLoading(false);
  }
};

export async function clearAllData() {
  const currentPlatform = getPlatform();
  console.log(
    "DataManagementService: Clearing all data. Platform:",
    currentPlatform
  );
  if (currentPlatform === "desktop") {
    try {
      console.log("Invoking clear_all_data...");
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("clear_all_data");
      console.log("SQLite data cleared successfully via invoke.");
    } catch (error) {
      console.error("Error invoking clear_all_data:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const { error } = await supabase.rpc("clear_all_user_data");

      if (error) {
        console.error("Error calling clear_all_user_data RPC:", error);
        throw error;
      }

      console.log("Successfully cleared user data via RPC.");
    } catch (error) {
      console.error("Error clearing Supabase data:", error);
      throw error; // Re-throw the error to be caught by the calling function
    }
  }

  console.log("Clearing Zustand store...");
  // After clearing data, we need to signal that any cached data is now stale.
  // Setting the fetch timestamp to a new value will trigger data re-fetching
  // in components that depend on it.
  useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
  console.log("Zustand store updated to reflect data changes.");
}

async function fetchAllTransactionsForExportWeb(): Promise<Transaction[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Web Export: User not authenticated.");
    throw new Error("User not authenticated for web export.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .select("*, recurring_transactions(*)")
    .order("date", { ascending: false });

  if (error) {
    console.error("Web Export: Supabase select error:", error);
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

export const exportDataWeb = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    const transactions = await fetchAllTransactionsForExportWeb();

    if (!transactions || transactions.length === 0) {
      toast.error("אין נתונים לייצא.");
      setIsLoading(false);
      return;
    }

    const jsonData = JSON.stringify(transactions, null, 2);
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

    toast.success("הנתונים יוצאו בהצלחה!");
  } catch (error) {
    console.error("Failed to export data (web):", error);
    if (error instanceof Error) {
      toast.error("שגיאה בייצוא הנתונים: " + error.message);
    } else {
      toast.error("שגיאה לא ידועה בייצוא הנתונים.");
    }
  } finally {
    setIsLoading(false);
  }
};

export const importDataWeb = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        toast.error("לא נבחר קובץ.");
        setIsLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileContents = e.target?.result as string;
          let transactionsToImport: Transaction[];

          try {
            transactionsToImport = JSON.parse(fileContents) as Transaction[];
          } catch (parseError) {
            toast.error("קובץ לא תקין או שאינו בפורמט JSON.");
            setIsLoading(false);
            return;
          }

          if (
            !Array.isArray(transactionsToImport) ||
            transactionsToImport.some(
              (t) =>
                typeof t.id === "undefined" ||
                typeof t.amount === "undefined" ||
                typeof t.date === "undefined" ||
                typeof t.type === "undefined"
            )
          ) {
            toast.error("מבנה הנתונים בקובץ אינו תקין או חסרים שדות הכרחיים.");
            setIsLoading(false);
            return;
          }

          if (transactionsToImport.length === 0) {
            toast("הקובץ שנבחר אינו מכיל נתונים לייבוא.");
            setIsLoading(false);
            return;
          }

          const confirmed = window.confirm(
            "האם אתה בטוח שברצונך לייבא את הנתונים מקובץ זה? " +
              "פעולה זו תמחק את כל הנתונים הנוכחיים שלך (בשרת) ותחליף אותם בנתונים מהקובץ. " +
              "מומלץ לגבות את הנתונים הנוכחיים תחילה אם יש כאלה בשרת."
          );

          if (!confirmed) {
            toast.error("ייבוא הנתונים בוטל.");
            setIsLoading(false);
            return;
          }

          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated for web import.");

          await clearAllDataFromDataService();

          const recurringIdMap = new Map<string, string>();
          let importCount = 0;

          for (const item of transactionsToImport) {
            try {
              const transaction = (item as any).transaction || item;
              const recurringInfo = (item as any).recurring_info;
              const desktopSourceRecurringId = transaction.source_recurring_id;

              let webSourceRecurringId: string | undefined = undefined;

              if (recurringInfo && desktopSourceRecurringId) {
                if (recurringIdMap.has(desktopSourceRecurringId)) {
                  webSourceRecurringId = recurringIdMap.get(
                    desktopSourceRecurringId
                  );
                } else {
                  const {
                    status,
                    frequency,
                    execution_count,
                    total_occurrences,
                    day_of_month,
                    start_date,
                    next_due_date,
                  } = recurringInfo;
                  const {
                    description,
                    amount,
                    currency,
                    type,
                    category,
                    is_chomesh,
                    recipient,
                  } = transaction;

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
                  };

                  const { data: newDefinition, error: definitionError } =
                    await supabase
                      .from("recurring_transactions")
                      .insert(definitionToInsert)
                      .select("id")
                      .single();

                  if (definitionError) {
                    console.error(
                      "Error creating recurring definition for",
                      desktopSourceRecurringId,
                      definitionError
                    );
                    continue;
                  }

                  if (newDefinition) {
                    webSourceRecurringId = newDefinition.id;
                    recurringIdMap.set(
                      desktopSourceRecurringId,
                      newDefinition.id
                    );
                  }
                }
              }

              const transactionToInsert = {
                ...transaction,
                user_id: user.id,
                source_recurring_id: webSourceRecurringId,
              };

              delete (transactionToInsert as any).recurring_info;

              await addTransaction(transactionToInsert as Transaction);
              importCount++;
            } catch (singleAddError) {
              console.error(
                "Error importing single transaction (web):",
                item.id,
                singleAddError
              );
            }
          }

          toast.success(
            `ייבוא הושלם! ${importCount} מתוך ${transactionsToImport.length} רשומות יובאו בהצלחה.`
          );
        } catch (importError) {
          console.error(
            "Failed to import data (web) during processing:",
            importError
          );
          if (importError instanceof Error) {
            toast.error("שגיאה בייבוא הנתונים: " + importError.message);
          } else {
            toast.error("שגיאה לא ידועה במהלך ייבוא הנתונים.");
          }
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        toast.error("שגיאה בקריאת הקובץ.");
        setIsLoading(false);
      };

      reader.readAsText(file);
    };

    input.click();
  } catch (error) {
    console.error("Failed to initiate import data (web):", error);
    toast.error("שגיאה בהתחלת תהליך הייבוא.");
    setIsLoading(false);
  }
};
