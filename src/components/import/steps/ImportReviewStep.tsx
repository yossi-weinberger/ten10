import { useState, useMemo, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ImportPreviewRow, ImportSummary } from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction } from "@/types/transaction";
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
  existingTransactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
}

export function ImportReviewStep({
  rows,
  summary,
  onToggleApproval,
  onBulkToggle,
  onToggleAllReady,
  onClearSelection,
  onUpdateRow,
  existingTransactions,
  recurringTransactions,
}: ImportReviewStepProps) {
  const { t } = useTranslation("import");
  const [filter, setFilter] = useState<FilterMode>("all");

  const filteredRows = useMemo(() => {
    switch (filter) {
      case "ready":
        return rows.filter((r) => r.status === "ready");
      case "needs_review":
        return rows.filter((r) => r.status === "needs_review");
      case "invalid":
        return rows.filter((r) => r.status === "invalid");
      default:
        return rows;
    }
  }, [rows, filter]);

  const filterButtons: { key: FilterMode; label: string; count: number }[] = [
    { key: "all", label: t("review.filters.all"), count: summary.total },
    { key: "ready", label: t("review.filters.ready"), count: summary.ready },
    {
      key: "needs_review",
      label: t("review.filters.needsReview"),
      count: summary.needsReview,
    },
    {
      key: "invalid",
      label: t("review.filters.invalid"),
      count: summary.invalid,
    },
  ].filter((btn) => btn.count > 0 || btn.key === "all");

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <ImportReviewSummary summary={summary} />

      {/* Bulk actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => startTransition(onToggleAllReady)}>
          {t("review.actions.selectAllReady")}
        </Button>
        <Button variant="outline" size="sm" onClick={onClearSelection}>
          {t("review.actions.clearSelection")}
        </Button>
      </div>

      {/* Filter tabs */}
      <div
        className="flex flex-wrap gap-1 border-b border-border pb-2"
        role="tablist"
      >
        {filterButtons.map(({ key, label, count }) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {label}
            {count > 0 && (
              <span className="ms-1.5 tabular-nums">({count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Desktop: Table / Mobile: Cards */}
      <div className="hidden md:block">
        <ImportReviewTable
          rows={filteredRows}
          onToggleApproval={onToggleApproval}
          onBulkToggle={onBulkToggle}
          onUpdateRow={onUpdateRow}
          existingTransactions={existingTransactions}
          recurringTransactions={recurringTransactions}
        />
      </div>
      <div className="md:hidden">
        <ImportReviewCards
          rows={filteredRows}
          onToggleApproval={onToggleApproval}
          onBulkToggle={onBulkToggle}
          onUpdateRow={onUpdateRow}
          existingTransactions={existingTransactions}
          recurringTransactions={recurringTransactions}
        />
      </div>
    </div>
  );
}
