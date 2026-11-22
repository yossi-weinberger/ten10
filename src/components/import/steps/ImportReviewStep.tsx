import { useState, useMemo, useEffect, useCallback, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ImportPreviewRow, ImportSummary } from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction, TransactionType } from "@/types/transaction";
import { useDonationStore } from "@/lib/store";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { cn } from "@/lib/utils/index";
import { MOBILE_SELECTION_CLEARANCE_CLASS } from "@/lib/responsive";
import { applyBulkEdit } from "@/lib/import/bulk-edit";
import { MobileBulkToolbar } from "@/components/card-list/MobileBulkToolbar";
import { BulkActionsToolbar } from "@/components/TransactionsTable/BulkActionsToolbar";
import { BulkEditDialog } from "@/components/TransactionsTable/BulkEditDialog";
import { ImportBulkEditFields } from "../ImportBulkEditFields";
import { ImportReviewSummary } from "../ImportReviewSummary";
import { ImportReviewTable } from "../ImportReviewTable";
import { ImportReviewCards } from "../ImportReviewCards";

type FilterMode = "all" | "ready" | "needs_review" | "invalid";

interface ImportReviewStepProps {
  rows: ImportPreviewRow[];
  summary: ImportSummary;
  onToggleApproval: (id: string, approved: boolean) => void;
  onBulkToggle: (ids: string[], approved: boolean) => void;
  onToggleAllReady: () => void;
  onClearSelection: () => void;
  onUpdateRow: (id: string, updates: Partial<ImportPreviewRow>) => void;
  onBulkUpdateRows: (rows: ImportPreviewRow[]) => void;
  onSelectModeChange?: (active: boolean) => void;
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

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

type FilterChip = { key: FilterMode; label: string; count: number };

function FilterChips({
  filters,
  active,
  onChange,
  className,
}: {
  filters: FilterChip[];
  active: FilterMode;
  onChange: (key: FilterMode) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-nowrap gap-2 overflow-x-auto no-scrollbar", className)} role="tablist">
      {filters.map(({ key, label, count }) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={`h-10 shrink-0 rounded-full px-3 text-sm transition-colors ${
            active === key
              ? "bg-primary text-primary-foreground"
              : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {label}
          {count > 0 ? <span className="ms-1.5 tabular-nums">({count})</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ImportReviewStep({
  rows,
  summary,
  onToggleApproval,
  onBulkToggle,
  onToggleAllReady,
  onClearSelection,
  onUpdateRow,
  onBulkUpdateRows,
  onSelectModeChange,
  existingTransactions,
  recurringTransactions,
}: ImportReviewStepProps) {
  const { t, i18n } = useTranslation("import");
  const dir = i18n.dir() === "rtl" ? "rtl" : "ltr";
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [bulkType, setBulkType] = useState<TransactionType | null>(null);
  const [bulkCategory, setBulkCategory] = useState<string | null | undefined>(undefined);
  const [appliedStatus, setAppliedStatus] = useState<{
    updated: number;
    becameInvalid: number;
  } | null>(null);

  useEffect(() => {
    onSelectModeChange?.(selectMode);
  }, [selectMode, onSelectModeChange]);

  useEffect(() => {
    if (!appliedStatus) return;
    const id = window.setTimeout(() => setAppliedStatus(null), 6000);
    return () => window.clearTimeout(id);
  }, [appliedStatus]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const selectableFiltered = useMemo(
    () => filteredRows.filter((r) => r.status !== "invalid"),
    [filteredRows],
  );

  const enterSelectMode = useCallback(() => {
    setSelectedIds(new Set());
    setSelectMode(true);
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setEditOpen(false);
    setBulkType(null);
    setBulkCategory(undefined);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allOn =
        selectableFiltered.length > 0 &&
        selectableFiltered.every((row) => next.has(row.id));
      for (const row of selectableFiltered) {
        if (allOn) next.delete(row.id);
        else next.add(row.id);
      }
      return next;
    });
  }, [selectableFiltered]);

  const clearBulkSelection = useCallback(() => setSelectedIds(new Set()), []);
  const openBulkEdit = useCallback(() => {
    setBulkType(null);
    setBulkCategory(undefined);
    setEditOpen(true);
  }, []);

  const selectedCount = selectedIds.size;
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds],
  );
  const canApply = bulkType !== null || bulkCategory !== undefined;

  const handleApply = useCallback(() => {
    if (!canApply || selectedCount === 0) return;
    const beforeStatus = new Map(rows.map((row) => [row.id, row.status]));
    const nextRows = applyBulkEdit(
      rows,
      [...selectedIds],
      {
        ...(bulkType !== null ? { type: bulkType } : {}),
        ...(bulkCategory !== undefined ? { category: bulkCategory } : {}),
      },
      { existingTransactions, recurringTransactions },
    );
    let becameInvalid = 0;
    for (const id of selectedIds) {
      if (beforeStatus.get(id) !== "invalid") {
        const after = nextRows.find((row) => row.id === id);
        if (after?.status === "invalid") becameInvalid += 1;
      }
    }
    onBulkUpdateRows(nextRows);
    setAppliedStatus({ updated: selectedCount, becameInvalid });
    setEditOpen(false);
    exitSelectMode();
  }, [
    canApply,
    selectedCount,
    bulkType,
    bulkCategory,
    rows,
    selectedIds,
    existingTransactions,
    recurringTransactions,
    onBulkUpdateRows,
    exitSelectMode,
  ]);

  const filterButtons: FilterChip[] = [
    { key: "all", label: t("review.filters.all"), count: summary.total },
    { key: "ready", label: t("review.filters.ready"), count: summary.ready },
    { key: "needs_review", label: t("review.filters.needsReview"), count: summary.needsReview },
    { key: "invalid", label: t("review.filters.invalid"), count: summary.invalid },
  ].filter((btn) => btn.count > 0 || btn.key === "all");

  const compactCountParts = [
    t("review.summary.compactCountsTotal", { count: summary.total }),
    t("review.summary.compactCountsReady", { count: summary.ready }),
  ];
  if (summary.needsReview > 0) {
    compactCountParts.push(t("review.summary.compactCountsReview", { count: summary.needsReview }));
  }
  if (summary.invalid > 0) {
    compactCountParts.push(t("review.summary.compactCountsInvalid", { count: summary.invalid }));
  }

  const fmt = (amount: number) => fmtAmount(amount, defaultCurrency);
  const compactMoneyParts: string[] = [];
  if (summary.approvedIncome > 0) {
    compactMoneyParts.push(t("review.summary.compactMoney.income", { amount: fmt(summary.approvedIncome) }));
  }
  if (summary.approvedExpenses > 0) {
    compactMoneyParts.push(t("review.summary.compactMoney.expenses", { amount: fmt(summary.approvedExpenses) }));
  }
  if (summary.approvedDonations > 0) {
    compactMoneyParts.push(t("review.summary.compactMoney.donations", { amount: fmt(summary.approvedDonations) }));
  }

  const allVisibleSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((row) => selectedIds.has(row.id));
  const someVisibleSelected =
    !allVisibleSelected && selectableFiltered.some((row) => selectedIds.has(row.id));

  const appliedMessage = appliedStatus
    ? [
        t("review.bulk.applied", { count: appliedStatus.updated }),
        appliedStatus.becameInvalid > 0
          ? t("review.bulk.becameInvalid", { count: appliedStatus.becameInvalid })
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    : null;

  const bulkToolbarProps = {
    selectedCount,
    selectedCountLabel: t("review.bulk.count", { count: selectedCount }),
    editLabel: t("review.bulk.edit", { count: selectedCount }),
    clearLabel: t("review.bulk.clear"),
    onEdit: openBulkEdit,
    onClear: clearBulkSelection,
    ariaLabel: t("review.bulk.toolbarAria"),
    dir: dir as "rtl" | "ltr",
  };

  const listProps = {
    rows: filteredRows,
    onToggleApproval,
    onBulkToggle,
    onUpdateRow,
    existingTransactions,
    recurringTransactions,
    selectMode,
    selectedIds,
    onToggleSelect: toggleSelect,
  };

  return (
    <div className="space-y-4 md:space-y-6" data-onboarding="import-review">
      {selectMode ? (
        <div className="md:hidden flex h-12 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Checkbox
              checked={someVisibleSelected ? "indeterminate" : allVisibleSelected}
              onCheckedChange={selectAllVisible}
              disabled={selectableFiltered.length === 0}
              className="h-[22px] w-[22px] rounded-full"
              aria-label={t("review.bulk.selectAllVisible", { count: selectableFiltered.length })}
            />
            <span className="truncate text-sm font-medium">
              {t("review.bulk.selectAllVisible", { count: selectableFiltered.length })}
            </span>
          </div>
          <button
            type="button"
            className="shrink-0 text-sm font-semibold text-primary underline-offset-2 hover:underline"
            onClick={exitSelectMode}
          >
            {t("review.bulk.done")}
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold leading-snug">{t("review.title2")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("review.lead")}</p>
          </div>
          <div className="md:hidden rounded-[10px] border bg-white px-3 py-2.5 space-y-1">
            <p className="text-[15px] font-bold leading-snug">{compactCountParts.join(" · ")}</p>
            {compactMoneyParts.length > 0 ? (
              <p
                className={cn("text-[13.5px] text-muted-foreground leading-snug", PH_SENSITIVE_PROPS.className)}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                {compactMoneyParts.join(" · ")}
              </p>
            ) : null}
          </div>
        </>
      )}

      <div className="hidden md:block">
        <ImportReviewSummary summary={summary} />
      </div>

      {!selectMode ? (
        <div className="hidden md:flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => startTransition(onToggleAllReady)}>
            {t("review.actions.selectAllReady")}
          </Button>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            {t("review.actions.clearSelection")}
          </Button>
          <Button variant="outline" size="sm" onClick={enterSelectMode}>
            {t("review.bulk.enter")}
          </Button>
        </div>
      ) : (
        <div className="hidden md:flex sticky top-0 z-20 items-center justify-between gap-3 bg-background/95 backdrop-blur-sm py-2">
          <BulkActionsToolbar {...bulkToolbarProps} />
          <button
            type="button"
            className="shrink-0 text-sm font-semibold text-primary underline-offset-2 hover:underline"
            onClick={exitSelectMode}
          >
            {t("review.bulk.done")}
          </button>
        </div>
      )}

      {!selectMode ? (
        <div className="relative pe-14 md:pe-0">
          <FilterChips filters={filterButtons} active={filter} onChange={setFilter} />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 end-14 w-8 bg-gradient-to-l from-background to-transparent md:hidden rtl:bg-gradient-to-r"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute end-0 top-0 h-10 md:hidden"
            onClick={enterSelectMode}
          >
            {t("review.bulk.enter")}
          </Button>
        </div>
      ) : (
        <FilterChips
          filters={filterButtons}
          active={filter}
          onChange={setFilter}
          className="hidden md:flex"
        />
      )}

      {appliedMessage ? (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {appliedMessage}
        </p>
      ) : null}

      {selectMode && selectedCount > 0 ? (
        <div className="md:hidden">
          <MobileBulkToolbar {...bulkToolbarProps} />
        </div>
      ) : null}

      <div className="hidden md:block">
        <ImportReviewTable {...listProps} onSelectAllVisible={selectAllVisible} />
      </div>
      <div className={cn("md:hidden", selectMode && selectedCount > 0 && MOBILE_SELECTION_CLEARANCE_CLASS)}>
        <ImportReviewCards {...listProps} />
      </div>

      <BulkEditDialog
        open={editOpen}
        title={t("review.bulk.sheetTitle", { count: selectedCount })}
        description={t("review.bulk.sheetDescription")}
        cancelLabel={t("confirm.cancel")}
        submitLabel={t("review.bulk.apply", { count: selectedCount })}
        pendingLabel={t("review.bulk.apply", { count: selectedCount })}
        pending={false}
        submitDisabled={!canApply}
        onOpenChange={(open) => {
          if (!open) setEditOpen(false);
        }}
        onSubmit={handleApply}
        dir={dir}
      >
        <ImportBulkEditFields
          selectedRows={selectedRows}
          type={bulkType}
          category={bulkCategory}
          onTypeChange={(next) => {
            setBulkType(next);
            setBulkCategory(undefined);
          }}
          onCategoryChange={setBulkCategory}
        />
      </BulkEditDialog>
    </div>
  );
}
