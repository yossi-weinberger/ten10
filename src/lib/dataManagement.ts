import { invoke } from "@tauri-apps/api/tauri";
import { save, open } from "@tauri-apps/api/dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/api/fs";
import { Transaction } from "@/types/transaction";
import { useDonationStore } from "@/lib/store";
import toast from "react-hot-toast";
import {
  loadTransactions,
  addTransaction,
  clearAllData as clearAllDataFromDataService,
} from "./dataService"; // Assuming dataService exports these

interface DataManagementOptions {
  setIsLoading: (loading: boolean) => void;
  // We can pass toast directly or a wrapper if needed
}

export const exportDataDesktop = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    const transactions = await invoke<Transaction[]>("get_transactions");
    if (!transactions || transactions.length === 0) {
      toast.error("אין נתונים לייצא.");
      setIsLoading(false);
      return;
    }

    const jsonData = JSON.stringify(transactions, null, 2);
    const suggestedFilename = `ten10_backup_${
      new Date().toISOString().split("T")[0]
    }.json`;

    const filePath = await save({
      title: "שמור גיבוי נתונים",
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
      toast.error("ייצוא הנתונים בוטל.");
    }
  } catch (error) {
    console.error("Failed to export data (desktop):", error);
    toast.error("שגיאה בייצוא הנתונים.");
  } finally {
    setIsLoading(false);
  }
};

export const importDataDesktop = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
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
        await invoke("add_transaction", { transaction });
      }

      const updatedTransactions = await invoke<Transaction[]>(
        "get_transactions"
      );
      useDonationStore.getState().setTransactions(updatedTransactions);

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

export const exportDataWeb = async ({
  setIsLoading,
}: DataManagementOptions): Promise<void> => {
  setIsLoading(true);
  try {
    // 1. Load transactions using dataService
    const transactions = await loadTransactions(); // Assumes loadTransactions handles user context for Supabase

    if (!transactions || transactions.length === 0) {
      toast.error("אין נתונים לייצא.");
      setIsLoading(false);
      return;
    }

    // 2. Convert to JSON
    const jsonData = JSON.stringify(transactions, null, 2);
    const dateString = new Date().toISOString().split("T")[0];
    const suggestedFilename = `ten10_backup_web_${dateString}.json`;

    // 3. Create a Blob
    const blob = new Blob([jsonData], { type: "application/json" });

    // 4. Create a download link and trigger download
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = suggestedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 5. Revoke the object URL
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
    // 1. Create an input element to open file dialog
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

          // 2. Parse JSON
          try {
            transactionsToImport = JSON.parse(fileContents) as Transaction[];
          } catch (parseError) {
            toast.error("קובץ לא תקין או שאינו בפורמט JSON.");
            setIsLoading(false);
            return;
          }

          // 3. Basic Validation (Consider Zod for more robust validation later)
          if (
            !Array.isArray(transactionsToImport) ||
            transactionsToImport.some(
              (t) =>
                typeof t.id === "undefined" || // id might be generated by DB on new insert, but good for structure check
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

          // 4. User Confirmation (TODO: Replace with shadcn/ui AlertDialog)
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

          // 5. Clear existing data (Web)
          await clearAllDataFromDataService(); // This calls Supabase delete
          toast.success("הנתונים הקיימים בשרת נמחקו.");

          // 6. Data Insertion (Web)
          for (const transaction of transactionsToImport) {
            // Prepare the transaction object for insertion.
            // Destructure to remove fields that should not be sent or will be regenerated.
            const {
              id,
              createdAt,
              updatedAt,
              user_id,
              ...transactionDataForSupabase
            } = transaction;

            // dataService.addTransaction expects an object that conforms to the Transaction type (or a subset it can handle).
            // It will internally handle adding the correct user_id and mapping to DB columns.
            await addTransaction(transactionDataForSupabase as Transaction); // Cast as Transaction, assuming other fields match
          }
          toast.success("הנתונים מהקובץ נשמרו בשרת.");

          // 7. Store Update (Web)
          const updatedTransactions = await loadTransactions();
          useDonationStore.getState().setTransactions(updatedTransactions);

          toast.success(
            "ייבוא הושלם! " +
              transactionsToImport.length +
              " רשומות יובאו בהצלחה לשרת ולסטור."
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

    input.click(); // Open file dialog
    // Note: setIsLoading(false) is handled within the onchange/onerror/finally blocks now.
  } catch (error) {
    console.error("Failed to initiate import data (web):", error);
    toast.error("שגיאה בהתחלת תהליך הייבוא.");
    setIsLoading(false); // Ensure loading is stopped if initial click setup fails
  }
};
