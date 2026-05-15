import { useState, useCallback, useOptimistic, startTransition, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Pencil } from "lucide-react";
import type { ImportPreviewRow } from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction, TransactionType } from "@/types/transaction";
import { typeBadgeColors } from "@/types/transactionLabels";
import { cn } from "@/lib/utils/index";
import { ImportRowStatusBadge } from "./ImportRowStatusBadge";
import { ImportRowEditModal } from "./ImportRowEditModal";

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

function fmtDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
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
      <div className="rounded-md border border-border overflow-hidden">
        {/* Select-all header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
          <Checkbox
            checked={someSelected ? "indeterminate" : allSelected}
            onCheckedChange={handleSelectAll}
            disabled={selectableRows.length === 0}
            aria-label={t("review.actions.selectAllSelectable")}
          />
          <span className="text-xs text-muted-foreground flex-1">
            {t("review.actions.selectAllSelectable")}
          </span>
          {approvedCount > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
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

// ---------------------------------------------------------------------------
// Individual row — compact single-line design, memoized for performance
// ---------------------------------------------------------------------------
interface RowCardProps {
  row: ImportPreviewRow;
  typeLabel: (type: string) => string;
  onToggleApproval: (id: string, approved: boolean) => void;
  onRequestEdit: (id: string) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function RowCard({ row, typeLabel, onToggleApproval, onRequestEdit, t }: RowCardProps) {
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

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2.5 border-b border-border last:border-b-0 transition-colors ${
        optimisticApproved ? "bg-primary/5" : ""
      } ${isInvalid ? "opacity-60" : ""}`}
    >
      <Checkbox
        checked={optimisticApproved}
        disabled={isInvalid}
        onCheckedChange={(checked) => handleToggle(!!checked)}
        className="shrink-0"
        aria-label={`Select row ${row.rowNumber}`}
      />

      {/* Content: description + meta */}
      <div className="flex-1 min-w-0">
        {/* Description */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium leading-tight truncate">
            {n?.description ?? <span className="text-muted-foreground">—</span>}
          </span>
        </div>
        {/* Date · type · issues */}
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {n?.date && (
            <span className="text-xs text-muted-foreground" dir="ltr">
              {fmtDate(n.date)}
            </span>
          )}
          {n?.type && (
            <Badge
              variant="outline"
              className={cn("border text-xs px-1.5 py-0 h-4 font-normal", typeBadgeColors[n.type as TransactionType])}
            >
              {typeLabel(n.type)}
            </Badge>
          )}
          {row.issues.map((issue, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {t(`issues.${issue.code}`, { field: issue.field ?? "", currency: issue.detail ?? "" })}
            </span>
          ))}
        </div>
      </div>

      {/* Trailing: amount + badge + edit */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-sm font-semibold tabular-nums leading-tight" dir="ltr">
          {n ? fmtAmount(n.amount, n.currency) : "—"}
        </span>
        <div className="flex items-center gap-1">
          <ImportRowStatusBadge status={row.status} />
          {!isInvalid && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={() => onRequestEdit(row.id)}
              aria-label={t("review.editRow")}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
