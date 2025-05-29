import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2 } from "lucide-react"; // Added Loader2
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store"; // Updated path
import { usePlatform } from "@/contexts/PlatformContext";

export function ExportButton() {
  const { exportTransactions, exportLoading, exportError } =
    useTableTransactionsStore((state) => ({
      exportTransactions: state.exportTransactions,
      exportLoading: state.exportLoading,
      exportError: state.exportError,
    }));
  const { platform } = usePlatform();
  const [prevExportLoading, setPrevExportLoading] = useState(false);

  useEffect(() => {
    if (prevExportLoading && !exportLoading) {
      if (exportError) {
        toast.error(`שגיאה ביצוא: ${exportError}`);
      } else {
        toast.success("הנתונים יוצאו בהצלחה!");
      }
    }
    setPrevExportLoading(exportLoading);
  }, [exportLoading, exportError, prevExportLoading]);

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (exportLoading || platform === "loading") return;
    try {
      await exportTransactions(format, platform);
      // Toast notifications are handled by useEffect
    } catch (error) {
      // This catch is more for unexpected errors not handled by the store's try/catch
      console.error(`Unexpected error during export to ${format}:`, error);
      toast.error("אירעה שגיאה לא צפויה במהלך היצוא.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={exportLoading || platform === "loading"}
        >
          {exportLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {exportLoading ? "מייצא..." : "יצוא נתונים"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>בחר פורמט ליצוא</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          disabled={exportLoading || platform === "loading"}
        >
          Excel (XLSX)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          disabled={exportLoading || platform === "loading"}
        >
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={exportLoading || platform === "loading"}
        >
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
