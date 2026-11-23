import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/index";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { ColumnMapping, ImportTargetField } from "@/lib/import/import-session.types";
import { TARGET_FIELD_REQUIRED } from "@/lib/import/mapping";
import { ColumnPickerSheet } from "./ColumnPickerSheet";

const NO_MAPPING_VALUE = "__none__";

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

function SampleChips({ samples }: { samples: string[] }) {
  if (samples.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {samples.map((sample, index) => (
        <span
          key={`${sample}-${index}`}
          className={cn(
            "inline-flex h-[26px] max-w-[14ch] items-center truncate rounded-full bg-muted px-2 text-[13px] text-foreground",
            PH_SENSITIVE_PROPS.className
          )}
          data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
          dir="ltr"
          style={{ unicodeBidi: "isolate" }}
        >
          {sample}
        </span>
      ))}
    </div>
  );
}

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  sampleRows: Record<string, unknown>[];
  onMappingChange: (sourceColumn: string, targetField: ImportTargetField | null) => void;
  issueColumns?: ReadonlySet<string>;
  issueTextByColumn?: ReadonlyMap<string, string>;
  autoMappedColumns?: Readonly<Record<string, ImportTargetField>>;
  className?: string;
}

function collectSamples(
  sampleRows: Record<string, unknown>[],
  sourceColumn: string
): string[] {
  return sampleRows
    .map((row) => {
      const val = row[sourceColumn];
      return val !== null && val !== undefined && val !== "" ? String(val) : null;
    })
    .filter(Boolean)
    .slice(0, 3) as string[];
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
  const isMobile = useMediaQuery("(max-width: 767px)");

  if (isMobile) {
    return (
      <MobileColumnMapper
        mappings={mappings}
        sampleRows={sampleRows}
        onMappingChange={onMappingChange}
        issueColumns={issueColumns}
        issueTextByColumn={issueTextByColumn}
        autoMappedColumns={autoMappedColumns}
        className={className}
      />
    );
  }

  return (
    <DesktopColumnMapper
      mappings={mappings}
      sampleRows={sampleRows}
      onMappingChange={onMappingChange}
      issueColumns={issueColumns}
      issueTextByColumn={issueTextByColumn}
      autoMappedColumns={autoMappedColumns}
      className={className}
    />
  );
}

function DesktopColumnMapper({
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

        const samples = collectSamples(sampleRows, mapping.sourceColumn);

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

function MobileColumnMapper({
  mappings,
  sampleRows,
  onMappingChange,
  issueColumns,
  issueTextByColumn,
  autoMappedColumns,
  className,
}: ColumnMapperProps) {
  const { t } = useTranslation("import");
  const [unmappedExpanded, setUnmappedExpanded] = useState(() => {
    const hasDate = mappings.some((m) => m.targetField === "date");
    // Match validateMappings: amount OR debit OR credit satisfies amount.
    const hasAmount = mappings.some(
      (m) =>
        m.targetField === "amount" ||
        m.targetField === "debit" ||
        m.targetField === "credit",
    );
    return !hasDate || !hasAmount;
  });
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const collapseToggleRef = useRef<HTMLButtonElement | null>(null);
  const pendingFocusRef = useRef<"collapse" | { column: string } | null>(null);

  const { visible, collapsible } = useMemo(() => {
    const visibleList: ColumnMapping[] = [];
    const collapsibleList: ColumnMapping[] = [];
    for (const mapping of mappings) {
      const flagged = issueColumns?.has(mapping.sourceColumn) ?? false;
      if (mapping.targetField === null && !flagged) {
        collapsibleList.push(mapping);
      } else {
        visibleList.push(mapping);
      }
    }
    return { visible: visibleList, collapsible: collapsibleList };
  }, [mappings, issueColumns]);

  useLayoutEffect(() => {
    if (openColumn !== null) return;
    const pending = pendingFocusRef.current;
    if (!pending) return;
    pendingFocusRef.current = null;

    if (pending === "collapse") {
      collapseToggleRef.current?.focus();
      return;
    }

    const same = triggerRefs.current.get(pending.column);
    if (same) {
      same.focus();
      return;
    }

    // Card vanished (e.g. flagged column skipped → issue cleared → collapsed).
    // Focus the next still-visible picker after it in mapping order, else the toggle.
    const order = mappings.map((m) => m.sourceColumn);
    const skippedIdx = order.indexOf(pending.column);
    for (let i = skippedIdx + 1; i < order.length; i++) {
      const next = triggerRefs.current.get(order[i]);
      if (next) {
        next.focus();
        return;
      }
    }
    collapseToggleRef.current?.focus();
  }, [openColumn, mappings, unmappedExpanded, collapsible.length]);

  const usedByOtherFor = (sourceColumn: string) => {
    const map = new Map<ImportTargetField, string>();
    for (const mapping of mappings) {
      if (
        mapping.targetField &&
        mapping.sourceColumn !== sourceColumn &&
        !map.has(mapping.targetField)
      ) {
        map.set(mapping.targetField, mapping.sourceColumn);
      }
    }
    return map;
  };

  const openMapping = openColumn
    ? mappings.find((m) => m.sourceColumn === openColumn) ?? null
    : null;

  const renderCard = (mapping: ColumnMapping) => {
    const isMapped = mapping.targetField !== null;
    const showRequiredOnTarget =
      mapping.targetField === "date" || mapping.targetField === "amount";
    const isIssue = issueColumns?.has(mapping.sourceColumn) ?? false;
    const inlineError = issueTextByColumn?.get(mapping.sourceColumn);
    const stillAuto =
      !!mapping.targetField &&
      autoMappedColumns?.[mapping.sourceColumn] === mapping.targetField;
    const samples = collectSamples(sampleRows, mapping.sourceColumn);
    const fieldLabel = isMapped
      ? t(`mapping.fields.${mapping.targetField}`)
      : t("mapping.noMapping");

    return (
      <div
        key={mapping.sourceColumn}
        data-mapping-column={mapping.sourceColumn}
        data-mapping-issue={isIssue ? "true" : undefined}
        data-mapping-unmapped={!isMapped ? "true" : undefined}
        data-mapping-card=""
        className={cn(
          "flex flex-col gap-2.5 rounded-xl border bg-white dark:bg-card p-3 scroll-mb-[140px]",
          isIssue && "border-destructive bg-red-50 dark:bg-red-950/20"
        )}
      >
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 text-[15px] font-bold leading-snug line-clamp-2">
            {mapping.sourceColumn}
          </span>
          {stillAuto && (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-green-700 dark:text-green-400">
              <Check className="h-3 w-3" aria-hidden="true" />
              {t("mapping.autoDetected")}
            </span>
          )}
        </div>

        <SampleChips samples={samples} />

        <button
          type="button"
          ref={(el) => {
            if (el) triggerRefs.current.set(mapping.sourceColumn, el);
            else triggerRefs.current.delete(mapping.sourceColumn);
          }}
          data-mapping-picker={mapping.sourceColumn}
          className={cn(
            "flex h-11 w-full items-center gap-1.5 rounded-md border px-3 text-start text-sm",
            isIssue
              ? "border-destructive"
              : isMapped
                ? "border-primary/50 bg-background"
                : "border-border bg-muted/50 text-muted-foreground"
          )}
          onClick={() => setOpenColumn(mapping.sourceColumn)}
        >
          <span className="min-w-0 flex-1 truncate">
            {isMapped ? `← ${fieldLabel}` : fieldLabel}
          </span>
          {showRequiredOnTarget && (
            <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded shrink-0">
              {t("mapping.required")}
            </span>
          )}
        </button>

        {inlineError && (
          <p className="text-[13.5px] text-destructive leading-snug text-start">
            {inlineError}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col gap-2.5", className)} data-mapping-mobile="">
      {visible.map(renderCard)}

      {collapsible.length > 0 && (
        <div data-mapping-unmapped-section="">
          <button
            type="button"
            ref={collapseToggleRef}
            data-mapping-unmapped-toggle=""
            className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border px-3 text-sm text-muted-foreground"
            aria-expanded={unmappedExpanded}
            onClick={() => setUnmappedExpanded((v) => !v)}
          >
            <span>
              {t("mapping.unmappedCollapsed", { count: collapsible.length })}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                unmappedExpanded && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
          {unmappedExpanded && (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {collapsible.map(renderCard)}
            </div>
          )}
        </div>
      )}

      {openMapping && (
        <ColumnPickerSheet
          open
          onOpenChange={(next) => {
            if (!next) {
              if (!pendingFocusRef.current) {
                pendingFocusRef.current = { column: openMapping.sourceColumn };
              }
              setOpenColumn(null);
            }
          }}
          sourceColumn={openMapping.sourceColumn}
          samples={collectSamples(sampleRows, openMapping.sourceColumn)}
          currentField={openMapping.targetField}
          usedByOther={usedByOtherFor(openMapping.sourceColumn)}
          onSelect={(field) => {
            const column = openMapping.sourceColumn;
            const willHideInCollapsed =
              field === null &&
              !(issueColumns?.has(column) ?? false) &&
              !unmappedExpanded;
            pendingFocusRef.current = willHideInCollapsed
              ? "collapse"
              : { column };
            onMappingChange(column, field);
          }}
        />
      )}
    </div>
  );
}
