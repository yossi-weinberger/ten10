import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ImportExportDataSectionProps {
  handleExportData: () => Promise<void>;
  isExporting: boolean;
  handleImportData: () => Promise<void>;
  isImporting: boolean;
}

export function ImportExportDataSection({
  handleExportData,
  isExporting,
  handleImportData,
  isImporting,
}: ImportExportDataSectionProps) {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  return (
    <div className="md:w-2/3 space-y-3 rounded-lg border bg-card p-4 shadow">
      <div className="flex items-center gap-2">
        <Label className="text-lg font-semibold">
          {t("importExport.exportTitle")}
        </Label>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("importExport.exportDescription")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleExportData}
          disabled={isExporting}
        >
          {isExporting
            ? tCommon("labels.loading")
            : t("importExport.exportButton")}
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleImportData}
          disabled={isImporting || isExporting} // Disable import if export is also in progress
        >
          {isImporting
            ? tCommon("labels.loading")
            : t("importExport.importButton")}
        </Button>
      </div>
    </div>
  );
}
