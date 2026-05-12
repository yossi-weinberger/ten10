import { useState, useCallback, useOptimistic } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { ImportPreviewRow } from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction } from "@/types/transaction";
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
  onUpdateRow: (id: string, updates: Partial<ImportPreviewRow>) => void;
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

export function ImportReviewCards({
  rows,
  onToggleApproval,
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

  if (rows.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">{t("review.noRows")}</p>
    );
  }

  return (
    <>
      <div className="space-y-3">
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
// Individual card — memoized for performance
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
      onToggleApproval(row.id, checked);
    },
    [row.id, onToggleApproval, setOptimisticApproved]
  );

  const isInvalid = row.status === "invalid";

  return (
    <Card
      className={`transition-colors ${
        optimisticApproved ? "border-primary/40 bg-primary/5" : ""
      } ${isInvalid ? "opacity-60" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={optimisticApproved}
            disabled={isInvalid}
            onCheckedChange={(checked) => handleToggle(!!checked)}
            className="mt-1 shrink-0"
            aria-label={`Select row ${row.rowNumber}`}
          />

          <div className="flex-1 min-w-0 space-y-2">
            {/* Header: row number + status + amount */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground" dir="ltr">
                  #{row.rowNumber}
                </span>
                <ImportRowStatusBadge status={row.status} />
              </div>
              <span className="font-semibold tabular-nums" dir="ltr">
                {row.normalized
                  ? fmtAmount(row.normalized.amount, row.normalized.currency)
                  : "—"}
              </span>
            </div>

            {/* Fields summary */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {row.normalized?.date && (
                <FieldValue label={t("review.columns.date")} value={fmtDate(row.normalized.date)} dir="ltr" />
              )}
              {row.normalized?.type && (
                <FieldValue label={t("review.columns.type")} value={typeLabel(row.normalized.type)} />
              )}
              {row.normalized?.description && (
                <FieldValue label={t("review.columns.description")} value={row.normalized.description} className="col-span-2 truncate" />
              )}
              {row.normalized?.recipient && (
                <FieldValue label={t("review.columns.recipient")} value={row.normalized.recipient} />
              )}
              {row.normalized?.category && (
                <FieldValue label={t("review.columns.category")} value={row.normalized.category} />
              )}
            </div>

            {/* Issues */}
            {row.issues.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-1">
                {row.issues.map((issue, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {t(`issues.${issue.code}`, { field: issue.field ?? "", currency: issue.detail ?? "" })}
                  </span>
                ))}
              </div>
            )}

            {/* Edit button */}
            {!isInvalid && (
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onRequestEdit(row.id)}
                >
                  {t("review.editRow")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldValue({ label, value, dir, className }: { label: string; value: string; dir?: string; className?: string }) {
  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span dir={dir}>{value}</span>
    </div>
  );
}
