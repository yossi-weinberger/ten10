import { useState, useCallback, useOptimistic, startTransition, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { ImportPreviewRow } from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction, TransactionType } from "@/types/transaction";
import { typeBadgeColors } from "@/types/transactionLabels";
import { cn } from "@/lib/utils/index";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { AmountPanel, TypeIconChip } from "@/components/card-list/TypeVisual";
import { ImportRowEditModal } from "./ImportRowEditModal";
import { useDisplayDate } from "@/lib/calendar/use-display-date";

function fmtAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

interface ImportReviewCardsProps {
  rows: ImportPreviewRow[];
  onToggleApproval: (id: string, approved: boolean) => void;
  onBulkToggle: (ids: string[], approved: boolean) => void;
  onUpdateRow: (id: string, updates: Partial<ImportPreviewRow>) => void;
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

export function ImportReviewCards({
  rows,
  onToggleApproval,
  onBulkToggle,
  onUpdateRow,
  existingTransactions,
  recurringTransactions,
}: ImportReviewCardsProps) {
  const { t } = useTranslation("import");
  const { t: tTx } = useTranslation("transactions");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const editingRow = editingRowId
    ? (rows.find((r) => r.id === editingRowId) ?? null)
    : null;

  const handleCloseModal = useCallback(() => setEditingRowId(null), []);
  const handleSave = useCallback(
    (id: string, updates: Partial<ImportPreviewRow>) => {
      onUpdateRow(id, updates);
      setEditingRowId(null);
    },
    [onUpdateRow]
  );

  const typeLabel = (type: string) =>
    tTx(`transactionForm.transactionType.${type}`, { defaultValue: type });

  const selectableRows = useMemo(() => rows.filter((r) => r.status !== "invalid"), [rows]);
  const approvedCount = useMemo(() => selectableRows.filter((r) => r.approved).length, [selectableRows]);
  const allSelected = selectableRows.length > 0 && approvedCount === selectableRows.length;
  const someSelected = approvedCount > 0 && approvedCount < selectableRows.length;

  const handleSelectAll = useCallback(() => {
    const ids = selectableRows.map((r) => r.id);
    startTransition(() => {
      onBulkToggle(ids, !allSelected);
    });
  }, [selectableRows, allSelected, onBulkToggle]);

  if (rows.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">{t("review.noRows")}</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2 min-h-11 px-1">
          <div className="grid h-11 w-11 place-items-center shrink-0">
            <Checkbox
              checked={someSelected ? "indeterminate" : allSelected}
              onCheckedChange={handleSelectAll}
              disabled={selectableRows.length === 0}
              className="h-[22px] w-[22px]"
              aria-label={t("review.actions.selectAllSelectable")}
            />
          </div>
          <span className="text-sm text-muted-foreground flex-1">
            {t("review.actions.selectAllSelectable")}
          </span>
          {approvedCount > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums pe-1">
              {approvedCount}/{selectableRows.length}
            </span>
          )}
        </div>

        {rows.map((row) => (
          <RowCard
            key={row.id}
            row={row}
            typeLabel={typeLabel}
            onToggleApproval={onToggleApproval}
            onRequestEdit={setEditingRowId}
            t={t}
          />
        ))}
      </div>

      <ImportRowEditModal
        row={editingRow}
        isOpen={editingRowId !== null}
        onClose={handleCloseModal}
        onSave={handleSave}
        existingTransactions={existingTransactions}
        recurringTransactions={recurringTransactions}
      />
    </>
  );
}

interface RowCardProps {
  row: ImportPreviewRow;
  typeLabel: (type: string) => string;
  onToggleApproval: (id: string, approved: boolean) => void;
  onRequestEdit: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function RowCard({ row, typeLabel, onToggleApproval, onRequestEdit, t }: RowCardProps) {
  const formatDisplayDate = useDisplayDate();
  const [optimisticApproved, setOptimisticApproved] = useOptimistic(
    row.approved,
    (_: boolean, next: boolean) => next
  );

  const handleToggle = useCallback(
    (checked: boolean) => {
      setOptimisticApproved(checked);
      startTransition(() => {
        onToggleApproval(row.id, checked);
      });
    },
    [row.id, onToggleApproval, setOptimisticApproved]
  );

  const isInvalid = row.status === "invalid";
  const n = row.normalized;
  const txType = (n?.type as TransactionType | undefined) ?? "expense";
  const description = n?.description ?? "";

  return (
    <div
      className={cn(
        "flex min-h-[60px] overflow-hidden rounded-[10px] border bg-white",
        optimisticApproved && "bg-primary/5",
        isInvalid && "opacity-60",
      )}
    >
      <div className="grid h-auto w-11 shrink-0 place-items-center self-stretch">
        <Checkbox
          checked={optimisticApproved}
          disabled={isInvalid}
          onCheckedChange={(checked) => handleToggle(!!checked)}
          className="h-[22px] w-[22px]"
          aria-label={t("review.selectRowAria", { row: row.rowNumber })}
        />
      </div>

      <button
        type="button"
        className="flex min-w-0 flex-1 items-stretch text-start"
        disabled={isInvalid}
        onClick={() => onRequestEdit(row.id)}
        aria-label={t("review.editRowAria", {
          row: row.rowNumber,
          description,
        })}
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-2 pe-1",
            PH_SENSITIVE_PROPS.className,
          )}
          data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
        >
          <TypeIconChip type={txType} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {description || <span className="text-muted-foreground">—</span>}
            </p>
            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
              {n?.date && (
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {Object.values(formatDisplayDate(n.date)).join(" · ")}
                </span>
              )}
              {n?.type && (
                <Badge
                  variant="outline"
                  className={cn(
                    "h-6 border px-2 text-[13px] font-semibold",
                    typeBadgeColors[n.type as TransactionType],
                  )}
                >
                  {typeLabel(n.type)}
                </Badge>
              )}
              {row.status === "needs_review" && (
                <span className="inline-flex h-6 items-center rounded-md border border-amber-300 bg-amber-50 px-2 text-[13px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
                  {t("status.needs_review")}
                </span>
              )}
              {row.status === "invalid" && (
                <span className="inline-flex h-6 items-center rounded-md border border-red-300 bg-red-50 px-2 text-[13px] font-semibold text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
                  {t("status.invalid")}
                </span>
              )}
            </div>
            {(n?.category || n?.recipient) && (
              <div className="mt-0.5 flex min-w-0 flex-wrap gap-x-2 text-xs text-muted-foreground">
                {n.category ? <span className="truncate">{n.category}</span> : null}
                {n.recipient ? <span className="truncate">{n.recipient}</span> : null}
              </div>
            )}
          </div>
        </div>

        <AmountPanel type={txType}>
          <span dir="ltr">
            {n ? fmtAmount(n.amount, n.currency) : "—"}
          </span>
        </AmountPanel>
      </button>
    </div>
  );
}
