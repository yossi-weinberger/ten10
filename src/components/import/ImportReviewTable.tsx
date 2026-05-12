import { useState, useCallback, memo, useOptimistic } from "react";
import { useTranslation } from "react-i18next";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

// ---------------------------------------------------------------------------
// Memoized row — no editing state inside; editing opens a full modal
// ---------------------------------------------------------------------------
interface ReviewRowProps {
  row: ImportPreviewRow;
  onToggleApproval: (id: string, approved: boolean) => void;
  onRequestEdit: (id: string) => void;
}

const ReviewTableRow = memo(function ReviewTableRow({
  row,
  onToggleApproval,
  onRequestEdit,
}: ReviewRowProps) {
  const { t, i18n } = useTranslation("import");
  const { t: tTx } = useTranslation("transactions");
  const isRtl = i18n.dir() === "rtl";

  // Instant visual feedback — checkbox flips before parent re-render completes
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

  const typeLabel = (type: string) =>
    tTx(`transactionForm.transactionType.${type}`, { defaultValue: type });

  const isInvalid = row.status === "invalid";

  return (
    <TableRow
      data-state={optimisticApproved ? "selected" : undefined}
      className={isInvalid ? "opacity-60" : ""}
    >
      {/* Checkbox */}
      <TableCell
        className={`sticky start-0 text-center align-middle transition-colors shadow-[1px_0_0_0_hsl(var(--border))] ${
          optimisticApproved ? "bg-primary/10" : "bg-background"
        }`}
      >
        <Checkbox
          checked={optimisticApproved}
          disabled={isInvalid}
          onCheckedChange={(checked) => handleToggle(!!checked)}
          aria-label={`Row ${row.rowNumber}`}
          className="block mx-auto"
        />
      </TableCell>

      {/* Row # */}
      <TableCell className="text-muted-foreground text-xs tabular-nums" dir="ltr">
        {row.rowNumber}
      </TableCell>

      {/* Status */}
      <TableCell>
        <ImportRowStatusBadge status={row.status} />
      </TableCell>

      {/* Date */}
      <TableCell dir="ltr" className="whitespace-nowrap">
        {row.normalized ? fmtDate(row.normalized.date) : "—"}
      </TableCell>

      {/* Amount */}
      <TableCell className="text-end whitespace-nowrap" dir="ltr">
        {row.normalized
          ? fmtAmount(row.normalized.amount, row.normalized.currency)
          : "—"}
      </TableCell>

      {/* Type */}
      <TableCell className="whitespace-nowrap">
        <span className="text-sm">
          {row.normalized ? typeLabel(row.normalized.type) : "—"}
        </span>
      </TableCell>

      {/* Description */}
      <TableCell className="max-w-[160px]">
        <span
          className="truncate block max-w-[160px]"
          title={row.normalized?.description ?? ""}
        >
          {row.normalized?.description ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      </TableCell>

      {/* Category */}
      <TableCell>
        <span className="text-sm">
          {row.normalized?.category ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      </TableCell>

      {/* Recipient */}
      <TableCell>
        <span className="text-sm">
          {row.normalized?.recipient ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      </TableCell>

      {/* Issues */}
      <TableCell>
        {row.issues.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {row.issues.length}
              </button>
            </TooltipTrigger>
            <TooltipContent side={isRtl ? "left" : "right"} className="max-w-xs">
              <ul className="text-xs space-y-0.5">
                {row.issues.map((issue, i) => (
                  <li key={i}>
                    {t(`issues.${issue.code}`, {
                      field: issue.field ?? "",
                      currency: issue.detail ?? "",
                    })}
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </TableCell>

      {/* Edit action */}
      <TableCell>
        {!isInvalid && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onRequestEdit(row.id)}
          >
            {t("review.editRow")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
});

// ---------------------------------------------------------------------------
// Table — owns the single shared edit modal
// ---------------------------------------------------------------------------
interface ImportReviewTableProps {
  rows: ImportPreviewRow[];
  onToggleApproval: (id: string, approved: boolean) => void;
  onBulkToggle: (ids: string[], approved: boolean) => void;
  onUpdateRow: (id: string, updates: Partial<ImportPreviewRow>) => void;
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

export function ImportReviewTable({
  rows,
  onToggleApproval,
  onBulkToggle,
  onUpdateRow,
  existingTransactions,
  recurringTransactions,
}: ImportReviewTableProps) {
  const { t, i18n } = useTranslation("import");
  const isRtl = i18n.dir() === "rtl";

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // Select-all state: based on selectable (non-invalid) rows
  const selectableRows = rows.filter((r) => r.status !== "invalid");
  const approvedCount = selectableRows.filter((r) => r.approved).length;
  const allSelected = selectableRows.length > 0 && approvedCount === selectableRows.length;
  const someSelected = approvedCount > 0 && approvedCount < selectableRows.length;

  const handleSelectAll = useCallback(() => {
    const ids = selectableRows.map((r) => r.id);
    onBulkToggle(ids, !allSelected);
  }, [selectableRows, allSelected, onBulkToggle]);
  const editingRow = editingRowId
    ? (rows.find((r) => r.id === editingRowId) ?? null)
    : null;

  const handleRequestEdit = useCallback((id: string) => {
    setEditingRowId(id);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditingRowId(null);
  }, []);

  const handleSave = useCallback(
    (id: string, updates: Partial<ImportPreviewRow>) => {
      onUpdateRow(id, updates);
      setEditingRowId(null);
    },
    [onUpdateRow]
  );

  return (
    <>
      {/*
       * Native <table> instead of shadcn <Table> so that our outer div is
       * the scroll context and <thead sticky> works correctly.
       */}
      <div
        className="overflow-auto rounded-md border"
        style={{ maxHeight: "60vh" }}
      >
        <table
          className="w-full caption-bottom text-sm"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <thead className="sticky top-0 z-20 bg-background border-b-2 border-border [&_tr]:border-b">
            <tr>
              <TableHead className="w-10 sticky start-0 bg-background z-30 text-center align-middle">
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? "indeterminate" : undefined}
                  onCheckedChange={handleSelectAll}
                  disabled={selectableRows.length === 0}
                  aria-label={t("review.actions.selectAllReady")}
                  className="block mx-auto"
                />
              </TableHead>
              <TableHead className="w-12 bg-background">
                {t("review.columns.row")}
              </TableHead>
              <TableHead className="bg-background">
                {t("review.columns.status")}
              </TableHead>
              <TableHead className="bg-background">
                {t("review.columns.date")}
              </TableHead>
              <TableHead className="text-end bg-background">
                {t("review.columns.amount")}
              </TableHead>
              <TableHead className="bg-background">
                {t("review.columns.type")}
              </TableHead>
              <TableHead className="max-w-[160px] bg-background">
                {t("review.columns.description")}
              </TableHead>
              <TableHead className="bg-background">
                {t("review.columns.category")}
              </TableHead>
              <TableHead className="bg-background">
                {t("review.columns.recipient")}
              </TableHead>
              <TableHead className="bg-background">
                {t("review.columns.issues")}
              </TableHead>
              <TableHead className="w-24 bg-background" />
            </tr>
          </thead>

          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center text-muted-foreground h-24"
                >
                  {t("review.noRows")}
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <ReviewTableRow
                key={row.id}
                row={row}
                onToggleApproval={onToggleApproval}
                onRequestEdit={handleRequestEdit}
              />
            ))}
          </TableBody>
        </table>
      </div>

      {/* Single shared modal — only mounted when a row is being edited */}
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
