import { invoke } from "@tauri-apps/api/tauri";
import { save, open } from "@tauri-apps/api/dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/api/fs";
import { Transaction } from "@/types/transaction";
import { useDonationStore } from "@/lib/store";
import toast from "react-hot-toast";

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
