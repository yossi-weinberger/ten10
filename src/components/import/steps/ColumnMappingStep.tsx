import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import type {
  ColumnMapping,
  ImportTargetField,
  ParsedFile,
  ParsedFileDiagnostic,
} from "@/lib/import/import-session.types";
import {
  buildConflictInlineOtherByColumn,
  formatDuplicateColumnsSummary,
  hasAmountDebitCreditIssue,
  issueColumns,
  truncateHeader,
  type MappingIssue,
} from "@/lib/import/mapping-issues";
import { ColumnMapper } from "../ColumnMapper";

interface ColumnMappingStepProps {
  parsedFile: ParsedFile;
  mappings: ColumnMapping[];
  isTen10Template: boolean;
  issues: MappingIssue[];
  autoMappedColumns: Record<string, ImportTargetField>;
  onMappingChange: (sourceColumn: string, targetField: ImportTargetField | null) => void;
}

export function ColumnMappingStep({
  parsedFile,
  mappings,
  isTen10Template,
  issues,
  autoMappedColumns,
  onMappingChange,
}: ColumnMappingStepProps) {
  const { t, i18n } = useTranslation("import");
  const isRtl = i18n.dir() === "rtl";
  const isMobile = useMediaQuery("(max-width: 767px)");
  const flaggedColumns = issueColumns(issues, mappings);
  const suppressAmountDebitDiag = hasAmountDebitCreditIssue(issues);

  const detectedCount = useMemo(() => {
    let count = 0;
    for (const mapping of mappings) {
      if (
        mapping.targetField &&
        autoMappedColumns[mapping.sourceColumn] === mapping.targetField
      ) {
        count += 1;
      }
    }
    return count;
  }, [mappings, autoMappedColumns]);

  const issueTextByColumn = useMemo(() => {
    const map = new Map<string, string>();
    const formatMore = (other: string, count: number) =>
      t("mapping.errors.otherPlusMore", { other, count });

    for (const issue of issues) {
      if (issue.code === "duplicateTarget") {
        const fieldLabel = t(`mapping.fields.${issue.field}`);
        // Build the shared "other" labels once per group (linear, bounded).
        const othersByColumn = buildConflictInlineOtherByColumn(
          issue,
          mappings,
          formatMore
        );
        for (const [column, other] of othersByColumn) {
          map.set(
            column,
            t("mapping.errors.duplicateTargetInline", {
              other,
              field: fieldLabel,
            })
          );
        }
      }
      if (issue.code === "amountAndDebitCredit") {
        const othersByColumn = buildConflictInlineOtherByColumn(
          issue,
          mappings,
          formatMore
        );
        for (const [column, other] of othersByColumn) {
          map.set(
            column,
            t("mapping.errors.amountAndDebitCreditInline", { other })
          );
        }
      }
    }
    return map;
  }, [issues, mappings, t]);

  const diagnostics = (parsedFile.diagnostics ?? []).filter(
    (d) => !(suppressAmountDebitDiag && d.code === "amount_debit_credit_columns")
  );

  return (
    <div className="space-y-4" data-onboarding="import-mapping">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h2 className="text-lg font-semibold">{t("mapping.title2")}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t("mapping.whatIsMapping")}
          </p>
        </div>
        <MappingHelpControl isMobile={isMobile} />
      </div>

      {isTen10Template ? (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            {t("mapping.ten10TemplateDetected")}
          </AlertDescription>
        </Alert>
      ) : (
        detectedCount > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-foreground">
            {t("mapping.detectedCount", { count: detectedCount })}
          </div>
        )
      )}

      {!isMobile && issues.length > 0 && (
        <Alert variant="destructive" id="mapping-issues-summary" aria-live="polite">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t("mapping.summary.titleInline")}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-0.5 mt-1">
              {issues.map((issue, index) => (
                <li key={`${issue.code}-${index}`}>{formatIssueSummary(t, issue)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {diagnostics.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-0.5">
              {diagnostics.map((diagnostic) => (
                <li key={diagnostic.code}>
                  {formatDiagnostic(t, diagnostic, parsedFile.sheetName)}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border border-border overflow-hidden">
        <div
          className="grid grid-cols-[1fr_36px_1fr] md:grid-cols-[1fr_minmax(0,130px)_36px_1fr] text-xs font-bold text-foreground/60 px-3 py-2.5 bg-muted/60 border-b border-border"
          style={isRtl ? { direction: "rtl" } : undefined}
        >
          <span>{t("mapping.sourceColumn")}</span>
          <span className="hidden md:block">{t("mapping.sampleColumnHeader")}</span>
          <span />
          <span className="ps-2">{t("mapping.targetField")}</span>
        </div>

        <ColumnMapper
          mappings={mappings}
          sampleRows={parsedFile.sampleRows}
          onMappingChange={onMappingChange}
          issueColumns={flaggedColumns}
          issueTextByColumn={issueTextByColumn}
          autoMappedColumns={autoMappedColumns}
          className="rounded-none border-0"
        />
      </div>
    </div>
  );
}

function MappingHelpControl({ isMobile }: { isMobile: boolean }) {
  const { t, i18n } = useTranslation("import");
  const content = <MappingHelpBody />;

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-11 shrink-0 gap-1.5 px-2"
            aria-label={t("mapping.help.open")}
          >
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            {t("mapping.help.open")}
          </Button>
        </DrawerTrigger>
        <DrawerContent dir={i18n.dir()}>
          <DrawerHeader className="text-start">
            <DrawerTitle>{t("mapping.help.title")}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {t("mapping.help.definition")}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-11 shrink-0 gap-1.5 px-2"
          aria-label={t("mapping.help.open")}
        >
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          {t("mapping.help.open")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80" dir={i18n.dir()}>
        <p className="font-semibold mb-2">{t("mapping.help.title")}</p>
        {content}
      </PopoverContent>
    </Popover>
  );
}

function MappingHelpBody() {
  const { t } = useTranslation("import");
  return (
    <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
      <p>{t("mapping.help.definition")}</p>
      <ul className="space-y-1 text-foreground">
        <li>{t("mapping.help.date")}</li>
        <li>{t("mapping.help.amount")}</li>
        <li>{t("mapping.help.description")}</li>
      </ul>
      <p>{t("mapping.help.rule")}</p>
      <div className="space-y-1">
        <p className="font-medium text-foreground">{t("mapping.help.exampleTitle")}</p>
        <p>{t("mapping.help.example1")}</p>
        <p>{t("mapping.help.example2")}</p>
        <p>{t("mapping.help.example3")}</p>
      </div>
    </div>
  );
}

function formatIssueSummary(
  t: ReturnType<typeof useTranslation>["t"],
  issue: MappingIssue
): string {
  switch (issue.code) {
    case "dateMissing":
      return t("mapping.errors.dateMissing");
    case "amountMissing":
      return t("mapping.errors.amountMissing");
    case "duplicateTarget":
      return t("mapping.errors.duplicateTarget", {
        columns: formatDuplicateColumnsSummary(issue, (other, count) =>
          t("mapping.errors.otherPlusMore", { other, count })
        ),
        field: t(`mapping.fields.${issue.field}`),
      });
    case "amountAndDebitCredit":
      return t("mapping.errors.amountAndDebitCredit");
    default: {
      const _exhaustive: never = issue;
      void _exhaustive;
      return t("mapping.errors.generic");
    }
  }
}

function formatDiagnostic(
  t: ReturnType<typeof useTranslation>["t"],
  diagnostic: ParsedFileDiagnostic,
  sheetName?: string
): string {
  const columns = (diagnostic.columns ?? [])
    .slice(0, 4)
    .map((column) => truncateHeader(column))
    .join(", ");
  return t(`mapping.diagnostics.${diagnostic.code}`, {
    count: diagnostic.count ?? 0,
    columns,
    sheet: sheetName ?? "",
  });
}
