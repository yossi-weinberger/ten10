import React from "react";
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
  return (
    <div className="md:w-2/3 space-y-3 rounded-lg border bg-card p-4 shadow">
      <div className="flex items-center gap-2">
        <Label className="text-lg font-semibold">ייבוא וייצוא נתונים</Label>
      </div>
      <p className="text-sm text-muted-foreground">
        ייצא את כל נתוני הטרנזקציות שלך לקובץ גיבוי (JSON), או ייבא נתונים מקובץ
        כזה.
        <br />
        <strong>שים לב:</strong> ייבוא נתונים מקובץ יחליף את כל הנתונים הקיימים.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleExportData}
          disabled={isExporting}
        >
          {isExporting ? "מייצא..." : "ייצוא נתונים לקובץ"}
        </Button>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={handleImportData}
          disabled={isImporting || isExporting} // Disable import if export is also in progress
        >
          {isImporting ? "מייבא..." : "ייבוא נתונים מקובץ"}
        </Button>
      </div>
    </div>
  );
}
