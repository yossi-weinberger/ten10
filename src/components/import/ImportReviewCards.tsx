import { useState, useCallback, useOptimistic, startTransition, useMemo, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { Check, Edit3, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { ImportPreviewRow } from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction } from "@/types/transaction";
import { cn } from "@/lib/utils/index";
import { rowBlocksApproval } from "@/lib/import/approval-gates";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import {
  categoryBaseForType,
  formatCategory,
} from "@/lib/category-registry";
import {
  AmountPanel,
  MOBILE_NEUTRAL_CARD_HEIGHT_CLASS,
  MOBILE_NEUTRAL_CARD_PAD_CLASS,
  TypeIconChip,
} from "@/components/card-list/TypeVisual";
import { SwipeableCardRow } from "@/components/card-list/SwipeableCardRow";
import { useSwipeOpenRow } from "@/hooks/useSwipeOpenRow";
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
  selectMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (id: string) => void;
}

export function ImportReviewCards({
  rows,
  onToggleApproval,
  onBulkToggle,
  onUpdateRow,
  existingTransactions,
  recurringTransactions,
  selectMode = false,
  selectedIds,
  onToggleSelect,
}: ImportReviewCardsProps) {
  const { t } = useTranslation("import");
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

  const selectableRows = useMemo(() => rows.filter((r) => !rowBlocksApproval(r)), [rows]);
  const approvedCount = useMemo(() => selectableRows.filter((r) => r.approved).length, [selectableRows]);
  const allSelected = selectableRows.length > 0 && approvedCount === selectableRows.length;
  const someSelected = approvedCount > 0 && approvedCount < selectableRows.length;

  const handleSelectAll = useCallback(() => {
    const ids = selectableRows.map((r) => r.id);
    startTransition(() => {
      onBulkToggle(ids, !allSelected);
    });
  }, [selectableRows, allSelected, onBulkToggle]);

  const { openId, open: onSwipeOpen, close: onSwipeClose } = useSwipeOpenRow(selectMode);

  if (rows.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">{t("review.noRows")}</p>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {!selectMode ? (
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
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {t("review.actions.selectAllSelectable")}
            </span>
            {selectableRows.length > 0 && (
              <span className="max-w-[58%] shrink truncate text-xs tabular-nums text-muted-foreground pe-1">
                {t("review.selection.willImport", {
                  selected: approvedCount,
                  count: selectableRows.length,
                })}
              </span>
            )}
          </div>
        ) : null}

        {rows.map((row) => (
          <RowCard
            key={row.id}
            row={row}
            onToggleApproval={onToggleApproval}
            onRequestEdit={setEditingRowId}
            selectMode={selectMode}
            isSelected={selectedIds?.has(row.id) ?? false}
            onToggleSelect={onToggleSelect}
            swipeOpenId={openId}
            onSwipeOpen={onSwipeOpen}
            onSwipeClose={onSwipeClose}
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
  onToggleApproval: (id: string, approved: boolean) => void;
  onRequestEdit: (id: string) => void;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelect?: (id: string) => void;
  swipeOpenId: string | null;
  onSwipeOpen: (id: string) => void;
  onSwipeClose: () => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function RowCard({
  row,
  onToggleApproval,
  onRequestEdit,
  selectMode,
  isSelected,
  onToggleSelect,
  swipeOpenId,
  onSwipeOpen,
  onSwipeClose,
  t,
}: RowCardProps) {
  const { i18n } = useTranslation("import");
  const isRTL = i18n.dir() === "rtl";
  const longPressTriggeredRef = useRef(false);
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
  const approvalBlocked = rowBlocksApproval(row);
  const n = row.normalized;
  const txType = n?.type ?? null;
  const description = n?.description ?? "";
  const showTypeUnset = !txType && row.issues.some((issue) => issue.code === "card_refund");
  const statusLabel =
    row.status === "needs_review"
      ? t("status.needs_review")
      : row.status === "invalid"
        ? t("status.invalid")
        : null;
  const statusDotClass =
    row.status === "needs_review"
      ? "bg-amber-500"
      : row.status === "invalid"
        ? "bg-red-500"
        : showTypeUnset
          ? "bg-muted-foreground/40"
          : null;
  const categoryText = n?.category
    ? formatCategory(categoryBaseForType(txType), n.category, i18n.language)
    : "";
  const metaDetail = categoryText || n?.recipient || "";
  const dateText = n?.date ? Object.values(formatDisplayDate(n.date)).join(" · ") : "";
  const rowAriaKey = selectMode ? "review.bulk.selectRowAria" : "review.selectRowAria";
  const amountInner = (
    <span
      className={PH_SENSITIVE_PROPS.className}
      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
      dir="ltr"
    >
      {n ? fmtAmount(n.amount, n.currency) : "—"}
    </span>
  );

  const handleCardActivate = () => {
    if (selectMode) {
      if (!isInvalid) onToggleSelect?.(row.id);
      return;
    }
    if (!isInvalid) onRequestEdit(row.id);
  };

  const handleKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleCardActivate();
  };

  return (
    <SwipeableCardRow
      id={row.id}
      role="group"
      tabIndex={-1}
      surfaceClassName={cn(
        MOBILE_NEUTRAL_CARD_HEIGHT_CLASS,
        "!items-stretch !gap-0 !p-0 shadow-none",
        "overflow-hidden bg-white text-foreground dark:bg-card",
        !selectMode && optimisticApproved && "bg-primary/5",
        selectMode && isSelected && "border-2 border-primary bg-primary/5",
        isInvalid && "opacity-60",
      )}
      isSelected={selectMode && isSelected}
      inSelectionMode={selectMode}
      selectionDisabled
      onActivate={handleCardActivate}
      onKeyDown={handleKeyDown}
      longPressTriggeredRef={longPressTriggeredRef}
      isRTL={isRTL}
      openId={swipeOpenId}
      onSwipeOpen={onSwipeOpen}
      onSwipeClose={onSwipeClose}
      actions={[
        {
          icon: <Edit3 className="h-5 w-5" aria-hidden="true" />,
          label: t("review.editRow"),
          disabled: isInvalid,
          onClick: () => {
            if (!isInvalid) onRequestEdit(row.id);
          },
        },
        {
          icon: optimisticApproved ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Check className="h-5 w-5" aria-hidden="true" />
          ),
          label: t(optimisticApproved ? "review.swipe.exclude" : "review.swipe.include"),
          disabled: approvalBlocked,
          onClick: () => {
            if (!approvalBlocked) handleToggle(!optimisticApproved);
          },
        },
      ]}
    >
      <div
        data-testid="import-review-card"
        className="grid w-11 shrink-0 place-items-center self-stretch"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        {selectMode ? (
          <Checkbox
            checked={isSelected}
            disabled={isInvalid}
            onCheckedChange={() => {
              if (!isInvalid) onToggleSelect?.(row.id);
            }}
            className="h-[22px] w-[22px] rounded-full"
            aria-label={t(rowAriaKey, { row: row.rowNumber })}
          />
        ) : (
          <Checkbox
            checked={optimisticApproved}
            disabled={approvalBlocked}
            onCheckedChange={(checked) => handleToggle(!!checked)}
            className="h-[22px] w-[22px]"
            aria-label={t(rowAriaKey, { row: row.rowNumber })}
          />
        )}
      </div>

      <button
        type="button"
        className={cn(
          "flex min-w-0 flex-1 items-stretch overflow-hidden text-start",
          MOBILE_NEUTRAL_CARD_PAD_CLASS,
        )}
        disabled={isInvalid && !selectMode}
        onClick={(event) => {
          event.stopPropagation();
          handleCardActivate();
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-label={
          selectMode
            ? t(rowAriaKey, { row: row.rowNumber })
            : t("review.editRowAria", { row: row.rowNumber })
        }
      >
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1 overflow-hidden",
            PH_SENSITIVE_PROPS.className,
          )}
          data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
        >
          {txType ? (
            <TypeIconChip type={txType} />
          ) : (
            <div className="size-6 shrink-0 rounded-full bg-muted/50" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden text-[12px] font-medium leading-none">
              {statusDotClass ? (
                <span
                  className={cn("size-2 shrink-0 rounded-full", statusDotClass)}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn(
                  "block min-w-0 flex-1 truncate",
                  !description && "text-muted-foreground",
                )}
              >
                {description || "—"}
              </span>
              {statusLabel ? <span className="sr-only">{statusLabel}</span> : null}
              {showTypeUnset ? <span className="sr-only">{t("review.typeUnset")}</span> : null}
            </div>
            {dateText || metaDetail ? (
              <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-x-1 overflow-hidden text-[10px] leading-none text-muted-foreground">
                {dateText ? (
                  <span className="shrink-0 whitespace-nowrap" dir="ltr">
                    {dateText}
                  </span>
                ) : null}
                {metaDetail ? (
                  <span className="min-w-0 flex-1 truncate">
                    {dateText ? <span aria-hidden="true">· </span> : null}
                    {metaDetail}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {txType ? (
          <AmountPanel type={txType}>{amountInner}</AmountPanel>
        ) : (
          <AmountPanel neutral>{amountInner}</AmountPanel>
        )}
      </button>
    </SwipeableCardRow>
  );
}
