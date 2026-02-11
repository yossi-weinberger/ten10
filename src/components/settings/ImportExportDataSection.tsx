import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowDownUp } from "lucide-react";

interface ImportExportDataSectionProps {
  handleExportData: () => Promise<void>;
  isExporting: boolean;
  handleImportData: () => Promise<void>;
  isImporting: boolean;
  className?: string;
}

export function ImportExportDataSection({
  handleExportData,
  isExporting,
  handleImportData,
  isImporting,
  className,
}: ImportExportDataSectionProps) {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5 text-primary" />
              <CardTitle>{t("importExport.exportTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("importExport.exportDescription")}
            </CardDescription>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-[220px]">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleExportData}
              disabled={isExporting}
            >
              {isExporting
                ? tCommon("labels.loading")
                : t("importExport.exportButton")}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleImportData}
              disabled={isImporting || isExporting}
            >
              {isImporting
                ? tCommon("labels.loading")
                : t("importExport.importButton")}
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
