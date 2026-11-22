import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { FILE_IMPORT_ALLOWED_TYPES } from "../../../supabase/functions/_shared/transaction-domain/transaction-types.ts";
import { getBulkCategoryFamily } from "@/lib/tableTransactions/bulkActions";
import { TYPE_ICON, TYPE_CHIP } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import type { ImportPreviewRow } from "@/lib/import/import-session.types";
import type { TransactionType } from "@/types/transaction";
import { cn } from "@/lib/utils";

export type ImportBulkEditFieldsProps = {
  selectedRows: readonly ImportPreviewRow[];
  type: TransactionType | null;
  category: string | null | undefined;
  onTypeChange: (type: TransactionType) => void;
  onCategoryChange: (category: string | null) => void;
};

function sharedRowType(
  rows: readonly ImportPreviewRow[],
): TransactionType | null {
  if (rows.length === 0) return null;
  const first = rows[0]?.normalized?.type;
  if (!first) return null;
  if (rows.some((row) => row.normalized?.type !== first)) return null;
  return first;
}

export function ImportBulkEditFields({
  selectedRows,
  type,
  category,
  onTypeChange,
  onCategoryChange,
}: ImportBulkEditFieldsProps) {
  const { t } = useTranslation("import");
  const { t: tTx } = useTranslation("transactions");

  const effectiveTypes = useMemo(
    () =>
      selectedRows.map((row) => ({
        type: (type ?? row.normalized?.type ?? "expense") as TransactionType,
      })),
    [selectedRows, type],
  );

  const categoryFamily = getBulkCategoryFamily(effectiveTypes);
  const categoryEnabled = categoryFamily !== null;
  const comboboxType: TransactionType =
    type ?? sharedRowType(selectedRows) ?? (categoryFamily === "income" ? "income" : "expense");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("review.bulk.typeLabel")}</Label>
        <div
          className="grid grid-cols-2 gap-2"
          role="radiogroup"
          aria-label={t("review.bulk.typeLabel")}
        >
          {FILE_IMPORT_ALLOWED_TYPES.map((option) => {
            const Icon = TYPE_ICON[option];
            const selected = type === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onTypeChange(option)}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-md border px-2 text-sm font-medium transition-colors",
                  TYPE_CHIP[option],
                  selected
                    ? "border-primary ring-2 ring-primary ring-offset-1"
                    : "border-border/70 hover:border-primary/40",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">
                  {tTx(`transactionForm.transactionType.${option}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="import-bulk-category">{t("review.bulk.categoryLabel")}</Label>
        <CategoryCombobox
          id="import-bulk-category"
          value={category === undefined ? null : category}
          onChange={onCategoryChange}
          transactionType={comboboxType}
          disabled={!categoryEnabled}
          placeholder={t("review.bulk.categoryLabel")}
        />
        {!categoryEnabled && type === null ? (
          <p className="text-sm text-muted-foreground">{t("review.bulk.categoryMixed")}</p>
        ) : null}
      </div>
    </div>
  );
}
