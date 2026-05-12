import { useTranslation } from "react-i18next";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  ColumnMapping,
  ParsedFile,
  MappingValidationError,
} from "@/lib/import/import-session.types";
import type { ImportTargetField } from "@/lib/import/import-session.types";
import { ColumnMapper } from "../ColumnMapper";

interface ColumnMappingStepProps {
  parsedFile: ParsedFile;
  mappings: ColumnMapping[];
  isTen10Template: boolean;
  validationErrors: MappingValidationError[];
  onMappingChange: (sourceColumn: string, targetField: ImportTargetField | null) => void;
}

export function ColumnMappingStep({
  parsedFile,
  mappings,
  isTen10Template,
  validationErrors,
  onMappingChange,
}: ColumnMappingStepProps) {
  const { t, i18n } = useTranslation("import");
  const isRtl = i18n.dir() === "rtl";

  return (
    <div className="space-y-4">
      {/* Ten10 template detected banner */}
      {isTen10Template && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            {t("mapping.ten10TemplateDetected")}
          </AlertDescription>
        </Alert>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive" aria-live="polite">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-0.5">
              {validationErrors.map((err) => (
                <li key={err}>{t(`mapping.errors.${err}`)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Explanation */}
      <div className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 border border-border">
        {t("mapping.hint")}
      </div>

      {/* Column header row */}
      <div
        className="grid grid-cols-[1fr_28px_1fr] text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 bg-muted/50 rounded-md"
        style={isRtl ? { direction: "rtl" } : undefined}
      >
        <span>{t("mapping.sourceColumn")}</span>
        <span />
        <span className="ps-2">{t("mapping.targetField")}</span>
      </div>

      {/* Mapping rows — no height cap, page scrolls */}
      <ColumnMapper
        mappings={mappings}
        sampleRows={parsedFile.sampleRows}
        onMappingChange={onMappingChange}
      />
    </div>
  );
}
