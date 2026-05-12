import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/index";
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
];

const NO_MAPPING_VALUE = "__none__";

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  sampleRows: Record<string, unknown>[];
  onMappingChange: (sourceColumn: string, targetField: ImportTargetField | null) => void;
  className?: string;
}

export function ColumnMapper({
  mappings,
  sampleRows,
  onMappingChange,
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
        const isRequired = isMapped && TARGET_FIELD_REQUIRED[mapping.targetField!];

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
            className={cn(
              // 3-col on mobile, 4-col on md+ (adds samples column)
              "grid grid-cols-[1fr_36px_1fr] md:grid-cols-[1fr_minmax(0,130px)_36px_1fr]",
              "items-center gap-0 px-3 py-2.5",
              "border-b border-border last:border-0",
              index % 2 === 0 ? "bg-background" : "bg-muted/30",
              isMapped && "bg-primary/5 border-s-2 border-s-primary/40"
            )}
            style={isRtl ? { direction: "rtl" } : undefined}
          >
            {/* Source column name + required badge */}
            <div className={cn("min-w-0 pe-2", isRtl ? "text-end" : "text-start")}>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-sm text-foreground truncate max-w-[150px]">
                  {mapping.sourceColumn}
                </span>
                {isRequired && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1 py-0.5 rounded shrink-0">
                    {t("mapping.required")}
                  </span>
                )}
              </div>
            </div>

            {/* Sample values — separate column, visible on md+ only */}
            <div className={cn(
              "hidden md:block min-w-0 pe-2",
              isRtl ? "text-end" : "text-start"
            )}>
              {samples.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {samples.map((s, idx) => (
                    <span
                      key={idx}
                      className="block text-xs text-muted-foreground truncate"
                      dir="ltr"
                      title={s}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground/30">—</span>
              )}
            </div>

            {/* Arrow */}
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

            {/* Target select */}
            <div className={cn("ps-2", isRtl ? "text-start" : "text-end")}>
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
                  className={cn(
                    "h-8 text-sm w-full text-start",
                    isMapped
                      ? "border-primary/50 bg-background"
                      : "border-border bg-muted/50 text-muted-foreground"
                  )}
                >
                  <SelectValue placeholder={t("mapping.noMapping")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_MAPPING_VALUE} className="text-muted-foreground">
                    {t("mapping.noMapping")}
                  </SelectItem>
                  {TARGET_FIELDS.map((field) => {
                    const alreadyUsed =
                      usedTargets.has(field) && mapping.targetField !== field;
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
