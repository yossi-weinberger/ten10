import { useState, useCallback, memo, useOptimistic, startTransition, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import type { ImportPreviewRow } from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction, TransactionType } from "@/types/transaction";
import { typeBadgeColors } from "@/types/transactionLabels";
import { cn } from "@/lib/utils/index";
import { rowBlocksApproval } from "@/lib/import/approval-gates";
import { ImportRowStatusBadge } from "./ImportRowStatusBadge";
import { ImportRowEditModal } from "./ImportRowEditModal";
import { useDisplayDate } from "@/lib/calendar/use-display-date";

const fmtAmountCache = new Map<string, Intl.NumberFormat>();

function fmtAmount(amount: number, currency: string): string {
  let fmt = fmtAmountCache.get(currency);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });
      fmtAmountCache.set(currency, fmt);
    } catch {
      return `${currency} ${amount}`;
    }
  }
  return fmt.format(amount);
}

interface ReviewRowProps {
  row: ImportPreviewRow;
  onToggleApproval: (id: string, approved: boolean) => void;
  onRequestEdit: (id: string) => void;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect?: (id: string) => void;
}

const ReviewTableRow = memo(function ReviewTableRow({
  row,
  onToggleApproval,
  onRequestEdit,
  selectMode,
  isSelected,
  onToggleSelect,
}: ReviewRowProps) {
  const { t, i18n } = useTranslation("import");
  const { t: tTx } = useTranslation("transactions");
  const formatDisplayDate = useDisplayDate();
  const isRtl = i18n.dir() === "rtl";

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

  const typeLabel = (type: string) =>
    tTx(`transactionForm.transactionType.${type}`, { defaultValue: type });

  const isInvalid = row.status === "invalid";
  const approvalBlocked = rowBlocksApproval(row);
  const selected = selectMode ? isSelected : optimisticApproved;

  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={isInvalid ? "opacity-60" : ""}
    >
      <TableCell
        className={`sticky start-0 w-10 min-w-10 p-0 text-center align-middle transition-colors shadow-[1px_0_0_0_hsl(var(--border))] ${
          selected ? "bg-primary/10" : "bg-background"
        }`}
      >
        <div className="flex items-center justify-center">
          {selectMode ? (
            <Checkbox
              checked={isSelected}
              disabled={isInvalid}
              onCheckedChange={() => {
                if (!isInvalid) onToggleSelect?.(row.id);
              }}
              className="rounded-full"
              aria-label={t("review.selectRowAria", { row: row.rowNumber })}
            />
          ) : (
            <Checkbox
              checked={optimisticApproved}
              disabled={approvalBlocked}
              onCheckedChange={(checked) => handleToggle(!!checked)}
              aria-label={t("review.selectRowAria", { row: row.rowNumber })}
            />
          )}
        </div>
      </TableCell>

      <TableCell className="text-center align-middle text-muted-foreground text-xs tabular-nums" dir="ltr">
        {row.rowNumber}
      </TableCell>

      <TableCell className="text-center align-middle">
        <ImportRowStatusBadge status={row.status} />
      </TableCell>

      <TableCell dir="auto" className="whitespace-nowrap">
        {row.normalized
          ? Object.values(formatDisplayDate(row.normalized.date)).join(" · ")
          : "—"}
      </TableCell>

      <TableCell
        className="ph-mask text-center align-middle whitespace-nowrap"
        data-ph-mask
        dir="ltr"
      >
        {row.normalized
          ? fmtAmount(row.normalized.amount, row.normalized.currency)
          : "—"}
      </TableCell>

      <TableCell className="whitespace-nowrap">
        {row.normalized ? (
          <Badge
            variant="outline"
            className={cn(
              "h-6 border px-2 text-[13px] font-semibold",
              typeBadgeColors[row.normalized.type as TransactionType],
            )}
          >
            {typeLabel(row.normalized.type)}
          </Badge>
        ) : "—"}
      </TableCell>

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

      <TableCell>
        <span className="text-sm">
          {row.normalized?.category ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      </TableCell>

      <TableCell>
        <span className="text-sm">
          {row.normalized?.recipient ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </span>
      </TableCell>

      <TableCell className="text-center align-middle">
        {row.issues.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="inline-flex items-center justify-center gap-1 text-xs text-amber-600 dark:text-amber-400">
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

      <TableCell className="text-center align-middle">
        {!isInvalid && !selectMode && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onRequestEdit(row.id)}
          >
            {t("review.editRow")}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
});

interface ImportReviewTableProps {
  rows: ImportPreviewRow[];
  onToggleApproval: (id: string, approved: boolean) => void;
  onBulkToggle: (ids: string[], approved: boolean) => void;
  onUpdateRow: (id: string, updates: Partial<ImportPreviewRow>) => void;
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  selectMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAllVisible?: () => void;
}

export function ImportReviewTable({
  rows,
  onToggleApproval,
  onBulkToggle,
  onUpdateRow,
  existingTransactions,
  recurringTransactions,
  selectMode = false,
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
}: ImportReviewTableProps) {
  const { t, i18n } = useTranslation("import");
  const isRtl = i18n.dir() === "rtl";

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const selectableRows = useMemo(
    () => rows.filter((r) => !rowBlocksApproval(r)),
    [rows]
  );
  const approvedCount = useMemo(
    () => selectableRows.filter((r) => r.approved).length,
    [selectableRows]
  );
  const allSelected = selectableRows.length > 0 && approvedCount === selectableRows.length;
  const someSelected = approvedCount > 0 && approvedCount < selectableRows.length;

  const selectedVisibleCount = useMemo(() => {
    if (!selectedIds) return 0;
    return selectableRows.filter((r) => selectedIds.has(r.id)).length;
  }, [selectableRows, selectedIds]);

  const allVisibleSelected =
    selectMode &&
    selectableRows.length > 0 &&
    selectedVisibleCount === selectableRows.length;
  const someVisibleSelected =
    selectMode &&
    selectedVisibleCount > 0 &&
    selectedVisibleCount < selectableRows.length;

  const handleSelectAll = useCallback(() => {
    if (selectMode) {
      onSelectAllVisible?.();
      return;
    }
    const ids = selectableRows.map((r) => r.id);
    startTransition(() => {
      onBulkToggle(ids, !allSelected);
    });
  }, [selectMode, onSelectAllVisible, selectableRows, allSelected, onBulkToggle]);

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
              <TableHead className="w-10 min-w-10 sticky start-0 bg-background z-30 p-0 text-center align-middle">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={
                      selectMode
                        ? someVisibleSelected
                          ? "indeterminate"
                          : allVisibleSelected
                        : someSelected
                          ? "indeterminate"
                          : allSelected
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={selectableRows.length === 0}
                    className={selectMode ? "rounded-full" : undefined}
                    aria-label={
                      selectMode
                        ? t("review.bulk.selectAllVisible", {
                            count: selectableRows.length,
                          })
                        : t("review.actions.selectAllSelectable")
                    }
                  />
                </div>
              </TableHead>
              <TableHead className="w-12 bg-background text-center align-middle">
                {t("review.columns.row")}
              </TableHead>
              <TableHead className="bg-background text-center align-middle">
                {t("review.columns.status")}
              </TableHead>
              <TableHead className="bg-background">
                {t("review.columns.date")}
              </TableHead>
              <TableHead className="bg-background text-center align-middle">
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
              <TableHead className="bg-background text-center align-middle">
                {t("review.columns.issues")}
              </TableHead>
              <TableHead className="w-24 bg-background text-center align-middle" />
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
                selectMode={selectMode}
                isSelected={selectedIds?.has(row.id) ?? false}
                onToggleSelect={onToggleSelect}
              />
            ))}
          </TableBody>
        </table>
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
