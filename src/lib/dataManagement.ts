import { Transaction } from "@/types/transaction";
import { useDonationStore } from "@/lib/store";
import toast from "react-hot-toast";
import {
  addTransaction,
  clearAllData as clearAllDataFromDataService,
} from "./dataService";
import { supabase } from "./supabaseClient";

interface DataManagementOptions {
  setIsLoading: (loading: boolean) => void;
}

interface ExportFiltersPayload {
  search?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  types?: string[] | null;
}

export const exportDataDesktop = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    // Dynamic imports for Tauri modules
    const { invoke } = await import("@tauri-apps/api/core");
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");

    const emptyFilters: ExportFiltersPayload = {};
    const transactions = await invoke<Transaction[]>(
      "export_transactions_handler",
      { filters: emptyFilters }
    );

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

      for (const transaction of transactionsToImport) {
        const transactionForRust: any = { ...transaction };
        if (transactionForRust.transaction_type && !transactionForRust.type) {
          transactionForRust.type = transactionForRust.transaction_type;
          delete transactionForRust.transaction_type;
        }
        await invoke("add_transaction", { transaction: transactionForRust });
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
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    console.error("Web Export: Supabase select error:", error);
    throw error;
  }

  return ((data as Transaction[]) || []).map((t_db) => {
    const t_js: any = { ...t_db };
    return t_js as Transaction;
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

          await clearAllDataFromDataService();

          let importCount = 0;
          for (const transaction of transactionsToImport) {
            try {
              await addTransaction(transaction as Transaction);
              importCount++;
            } catch (singleAddError) {
              console.error(
                "Error importing single transaction (web):",
                transaction.id,
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
