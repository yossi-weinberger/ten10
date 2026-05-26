import { useTranslation } from "react-i18next";
import { CheckCircle, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ImportResult } from "@/lib/import/import-session.types";
import { useNavigate } from "@tanstack/react-router";

interface ImportResultStepProps {
  result: ImportResult;
  onImportAnother: () => void;
}

export function ImportResultStep({
  result,
  onImportAnother,
}: ImportResultStepProps) {
  const { t } = useTranslation("import");
  const navigate = useNavigate();

  const hasErrors = result.errors.length > 0;

  const handleDownloadErrors = () => {
    const content = result.errors
      .map((error) =>
        [
          `code=${error.code}`,
          error.rowNumber ? `row=${error.rowNumber}` : null,
          error.detail ? `detail=${error.detail}` : null,
        ].filter(Boolean).join(" ")
      )
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-errors.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Success / failure header */}
      <div className="flex flex-col items-center gap-3 text-center">
        {result.inserted > 0 ? (
          <CheckCircle className="h-12 w-12 text-green-500" />
        ) : (
          <AlertTriangle className="h-12 w-12 text-amber-500" />
        )}
        <h3 className="text-xl font-semibold">{t("result.title")}</h3>
      </div>

      {/* Counts */}
      <div className="space-y-2 max-w-sm mx-auto">
        {result.inserted > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("result.inserted", { count: result.inserted })}
            </span>
            <span className="font-semibold text-green-600 dark:text-green-400" dir="ltr">
              +{result.inserted}
            </span>
          </div>
        )}
        {result.skipped > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("result.skipped", { count: result.skipped })}
            </span>
            <span className="text-muted-foreground" dir="ltr">
              {result.skipped}
            </span>
          </div>
        )}
        {result.failed > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {t("result.failed", { count: result.failed })}
            </span>
            <span className="text-destructive font-semibold" dir="ltr">
              {result.failed}
            </span>
          </div>
        )}
        {result.inserted === 0 && result.failed === 0 && (
          <p className="text-center text-muted-foreground text-sm">
            {t("result.noRowsImported")}
          </p>
        )}
      </div>

      {/* Errors */}
      {hasErrors && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>
              {t(`flowErrors.${result.errors[0].code}`, {
                defaultValue: result.errors[0].detail ?? result.errors[0].code,
              })}
            </p>
            {result.errors.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadErrors}
                className="gap-1"
              >
                <Download className="h-3.5 w-3.5" />
                {t("result.errorReport")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          onClick={() => navigate({ to: "/transactions-table" })}
          variant="default"
        >
          {t("result.viewTransactions")}
        </Button>
        <Button variant="outline" onClick={onImportAnother}>
          {t("result.importAnother")}
        </Button>
      </div>
    </div>
  );
}
