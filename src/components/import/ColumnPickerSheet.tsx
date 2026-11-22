import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils/index";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import type { ImportTargetField } from "@/lib/import/import-session.types";
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

interface ColumnPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceColumn: string;
  samples: string[];
  currentField: ImportTargetField | null;
  /** Map of target field → source column that currently owns it (excluding the open column). */
  usedByOther: ReadonlyMap<ImportTargetField, string>;
  onSelect: (field: ImportTargetField | null) => void;
}

export function ColumnPickerSheet({
  open,
  onOpenChange,
  sourceColumn,
  samples,
  currentField,
  usedByOther,
  onSelect,
}: ColumnPickerSheetProps) {
  const { t, i18n } = useTranslation("import");
  const dir = i18n.dir();

  const handleSelect = (field: ImportTargetField | null) => {
    onSelect(field);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        dir={dir}
        className="max-h-[86vh]"
        data-column-picker-sheet=""
      >
        <DrawerHeader className="gap-2 text-start">
          <DrawerDescription className="text-muted-foreground">
            {t("mapping.sheet.question")}
          </DrawerDescription>
          <DrawerTitle className="text-[18px] font-bold leading-snug">
            {sourceColumn}
          </DrawerTitle>
          <SampleChips samples={samples} />
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
          <ul className="space-y-0.5" role="listbox" aria-label={t("mapping.sheet.question")}>
            <li>
              <OptionButton
                selected={currentField === null}
                onClick={() => handleSelect(null)}
                label={t("mapping.noMapping")}
                subline={t("mapping.sheet.skipHint")}
                muted
              />
            </li>
            {TARGET_FIELDS.map((field) => {
              const usedBy = usedByOther.get(field);
              const isSelected = currentField === field;
              const disabled = !!usedBy && !isSelected && field !== "description";
              const alsoMarked =
                isSelected && usedBy
                  ? t("mapping.sheet.alsoMarked", { column: usedBy })
                  : null;
              const usedByLabel =
                disabled && usedBy
                  ? t("mapping.sheet.usedBy", { column: usedBy })
                  : null;
              const requiredLabel =
                TARGET_FIELD_REQUIRED[field] && !alsoMarked && !usedByLabel
                  ? t("mapping.required")
                  : null;

              return (
                <li key={field}>
                  <OptionButton
                    selected={isSelected}
                    disabled={disabled}
                    onClick={() => handleSelect(field)}
                    label={t(`mapping.fields.${field}`)}
                    subline={alsoMarked ?? usedByLabel ?? requiredLabel}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function OptionButton({
  selected,
  disabled,
  onClick,
  label,
  subline,
  muted,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  subline?: string | null;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-12 w-full items-center gap-2 px-3 py-2 text-start",
        selected && "rounded-lg bg-accent/20 font-bold",
        disabled && "cursor-not-allowed opacity-50",
        muted && !selected && "text-muted-foreground"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-tight">{label}</span>
        {subline ? (
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground leading-snug">
            {subline}
          </span>
        ) : null}
      </span>
      {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
    </button>
  );
}
