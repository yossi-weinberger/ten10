import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/index";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import type { ColumnMapping, ImportTargetField } from "@/lib/import/import-session.types";
import { TARGET_FIELD_REQUIRED } from "@/lib/import/mapping";

const TARGET_FIELDS: ImportTargetField[] = [
  "date",
  "amount",
  "debit",
  "credit",
  "description",
  "currency",
  "type",
  "category",
  "recipient",
  "payment_method",
  "is_chomesh",
];

const NO_MAPPING_VALUE = "__none__";

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  sampleRows: Record<string, unknown>[];
  onMappingChange: (sourceColumn: string, targetField: ImportTargetField | null) => void;
  issueColumns?: ReadonlySet<string>;
  issueTextByColumn?: ReadonlyMap<string, string>;
  autoMappedColumns?: Readonly<Record<string, ImportTargetField>>;
  className?: string;
}

export function ColumnMapper({
  mappings,
  sampleRows,
  onMappingChange,
  issueColumns,
  issueTextByColumn,
  autoMappedColumns,
  className,
}: ColumnMapperProps) {
  const { t, i18n } = useTranslation("import");
  const isRtl = i18n.dir() === "rtl";

  const usedTargets = new Set(
    mappings.filter((m) => m.targetField !== null).map((m) => m.targetField!)
  );

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      {mappings.map((mapping, index) => {
        const isMapped = mapping.targetField !== null;
        const showRequiredOnTarget =
          mapping.targetField === "date" || mapping.targetField === "amount";
        const isIssue = issueColumns?.has(mapping.sourceColumn) ?? false;
        const inlineError = issueTextByColumn?.get(mapping.sourceColumn);
        const stillAuto =
          !!mapping.targetField &&
          autoMappedColumns?.[mapping.sourceColumn] === mapping.targetField;

        const samples = sampleRows
          .map((row) => {
            const val = row[mapping.sourceColumn];
            return val !== null && val !== undefined && val !== "" ? String(val) : null;
          })
          .filter(Boolean)
          .slice(0, 3) as string[];

        return (
          <div
            key={mapping.sourceColumn}
            data-mapping-column={mapping.sourceColumn}
            data-mapping-issue={isIssue ? "true" : undefined}
            data-mapping-unmapped={!isMapped ? "true" : undefined}
            className={cn(
              "grid grid-cols-[1fr_36px_1fr] md:grid-cols-[1fr_minmax(0,130px)_36px_1fr]",
              "items-center gap-0 px-3 py-2.5 scroll-mb-[140px]",
              "border-b border-border last:border-0",
              index % 2 === 0 ? "bg-background" : "bg-muted/30",
              isMapped && !isIssue && "bg-primary/5 border-s-2 border-s-primary/40",
              isIssue && "border-destructive bg-red-50 border-s-[3px] border-s-destructive dark:bg-red-950/20"
            )}
            style={isRtl ? { direction: "rtl" } : undefined}
          >
            <div className={cn("min-w-0 pe-2", isRtl ? "text-end" : "text-start")}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-sm text-foreground truncate max-w-[150px]">
                  {mapping.sourceColumn}
                </span>
                {stillAuto && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-green-700 dark:text-green-400">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {t("mapping.autoDetected")}
                  </span>
                )}
              </div>
            </div>

            <div
              className={cn(
                "hidden md:block min-w-0 pe-2",
                isRtl ? "text-end" : "text-start"
              )}
            >
              {samples.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {samples.map((s, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        "block text-xs text-muted-foreground truncate",
                        PH_SENSITIVE_PROPS.className
                      )}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                      dir="ltr"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/30">—</span>
              )}
            </div>

            <div className="flex items-center justify-center select-none">
              {isMapped ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15">
                  <ArrowIcon className="h-3.5 w-3.5 text-primary" />
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                  <ArrowIcon className="h-3.5 w-3.5 text-muted-foreground/30" />
                </div>
              )}
            </div>

            <div className={cn("ps-2 space-y-1", isRtl ? "text-start" : "text-end")}>
              <Select
                dir={isRtl ? "rtl" : undefined}
                value={mapping.targetField ?? NO_MAPPING_VALUE}
                onValueChange={(val) =>
                  onMappingChange(
                    mapping.sourceColumn,
                    val === NO_MAPPING_VALUE ? null : (val as ImportTargetField)
                  )
                }
              >
                <SelectTrigger
                  data-mapping-picker={mapping.sourceColumn}
                  className={cn(
                    "h-8 text-sm w-full text-start",
                    isIssue
                      ? "border-destructive"
                      : isMapped
                        ? "border-primary/50 bg-background"
                        : "border-border bg-muted/50 text-muted-foreground"
                  )}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5">
                    <SelectValue placeholder={t("mapping.noMapping")} />
                    {showRequiredOnTarget && (
                      <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded shrink-0">
                        {t("mapping.required")}
                      </span>
                    )}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MAPPING_VALUE} className="text-muted-foreground">
                    {t("mapping.noMapping")}
                  </SelectItem>
                  {TARGET_FIELDS.map((field) => {
                    const alreadyUsed =
                      field !== "description" &&
                      usedTargets.has(field) &&
                      mapping.targetField !== field;
                    return (
                      <SelectItem key={field} value={field} disabled={alreadyUsed}>
                        {t(`mapping.fields.${field}`)}
                        {TARGET_FIELD_REQUIRED[field] && (
                          <span className="text-primary ms-1">*</span>
                        )}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {inlineError && (
                <p className="text-[13.5px] text-destructive leading-snug text-start">
                  {inlineError}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
