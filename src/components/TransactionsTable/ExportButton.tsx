import React from "react";
import { useTranslation } from "react-i18next";
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
import { Download } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store"; // Updated path
import { EXPORT_DESKTOP_SAVE_CANCELLED } from "@/lib/utils/save-export-file";
import { usePlatform } from "@/contexts/PlatformContext";
import { logger } from "@/lib/logger";

export function ExportButton({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation("data-tables");
  const { exportTransactions, exportLoading } = useTableTransactionsStore(
    useShallow((state) => ({
      exportTransactions: state.exportTransactions,
      exportLoading: state.exportLoading,
    }))
  );
  const { platform } = usePlatform();
  const label = compact ? t("buttons.exportShort") : t("export.title");

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    if (exportLoading || platform === "loading") return;
    const toastId = toast.loading(t("export.loading"));
    try {
      await exportTransactions(format, platform);
      const { exportError } = useTableTransactionsStore.getState();
      if (exportError === EXPORT_DESKTOP_SAVE_CANCELLED) {
        // Desktop save dialog closed without saving — not an error, dismiss silently.
        toast.dismiss(toastId);
      } else if (exportError) {
        toast.error(t("export.error", { error: exportError }), { id: toastId });
      } else {
        toast.success(t("export.success"), { id: toastId });
      }
    } catch (error) {
      // This catch is more for unexpected errors not handled by the store's try/catch
      logger.error(`Unexpected error during export to ${format}:`, error);
      toast.error(t("export.unexpectedError"), { id: toastId });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={exportLoading || platform === "loading"}
          className={
            compact
              ? "min-w-0 max-w-full bg-transparent text-foreground hover:bg-muted/50"
              : "bg-transparent text-foreground hover:bg-muted/50"
          }
          aria-label={t("export.title")}
        >
          <Download className="me-2 h-4 w-4 shrink-0" />
          <span className={compact ? "min-w-0 truncate" : undefined}>
            {label}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("export.selectFormat")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          disabled={exportLoading || platform === "loading"}
          className="text-foreground"
        >
          Excel (XLSX)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          disabled={exportLoading || platform === "loading"}
          className="text-foreground"
        >
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={exportLoading || platform === "loading"}
          className="text-foreground"
        >
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
