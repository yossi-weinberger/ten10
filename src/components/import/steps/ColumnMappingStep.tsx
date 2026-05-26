import { useTranslation } from "react-i18next";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  ColumnMapping,
  ImportTargetField,
  MappingValidationError,
  ParsedFile,
  ParsedFileDiagnostic,
} from "@/lib/import/import-session.types";
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
      {/* Single contextual explanation — template banner OR plain text, never both */}
      {isTen10Template ? (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            {t("mapping.ten10TemplateDetected")}
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-sm text-foreground/80 leading-relaxed">
          {t("mapping.whatIsMapping")}
        </p>
      )}

      {parsedFile.diagnostics && parsedFile.diagnostics.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-0.5">
              {parsedFile.diagnostics.map((diagnostic) => (
                <li key={diagnostic.code}>
                  {formatDiagnostic(t, diagnostic)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Unified header + mapper table */}
      <div className="rounded-lg border border-border overflow-hidden">
        {/* Column header row — matches mapper grid exactly */}
        <div
          className="grid grid-cols-[1fr_36px_1fr] md:grid-cols-[1fr_minmax(0,130px)_36px_1fr] text-xs font-bold text-foreground/60 uppercase tracking-wide px-3 py-2.5 bg-muted/60 border-b border-border"
          style={isRtl ? { direction: "rtl" } : undefined}
        >
          <span>{t("mapping.sourceColumn")}</span>
          {/* Samples column header — only visible on md+ */}
          <span className="hidden md:block">{t("mapping.sampleColumnHeader")}</span>
          <span />
          <span className="ps-2">{t("mapping.targetField")}</span>
        </div>

        {/* Mapping rows */}
        <ColumnMapper
          mappings={mappings}
          sampleRows={parsedFile.sampleRows}
          onMappingChange={onMappingChange}
          className="rounded-none border-0"
        />
      </div>

      {/* Validation errors — shown at bottom so they are visible near the Next button */}
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
    </div>
  );
}

function formatDiagnostic(
  t: ReturnType<typeof useTranslation>["t"],
  diagnostic: ParsedFileDiagnostic
): string {
  return t(`mapping.diagnostics.${diagnostic.code}`, {
    count: diagnostic.count ?? 0,
    columns: diagnostic.columns?.join(", ") ?? "",
  });
}
