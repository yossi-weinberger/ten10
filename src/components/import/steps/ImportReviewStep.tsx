import { useState, useMemo, startTransition } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { ImportPreviewRow, ImportSummary } from "@/lib/import/import-session.types";
import type { Transaction, RecurringTransaction } from "@/types/transaction";
import { useDonationStore } from "@/lib/store";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { cn } from "@/lib/utils/index";
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
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
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

  const compactCountParts = [
    t("review.summary.compactCountsTotal", { count: summary.total }),
    t("review.summary.compactCountsReady", { count: summary.ready }),
  ];
  if (summary.needsReview > 0) {
    compactCountParts.push(
      t("review.summary.compactCountsReview", { count: summary.needsReview }),
    );
  }
  if (summary.invalid > 0) {
    compactCountParts.push(
      t("review.summary.compactCountsInvalid", { count: summary.invalid }),
    );
  }

  const fmt = (amount: number) => fmtAmount(amount, defaultCurrency);
  const compactMoneyParts: string[] = [];
  if (summary.approvedIncome > 0) {
    compactMoneyParts.push(
      t("review.summary.compactMoney.income", { amount: fmt(summary.approvedIncome) }),
    );
  }
  if (summary.approvedExpenses > 0) {
    compactMoneyParts.push(
      t("review.summary.compactMoney.expenses", { amount: fmt(summary.approvedExpenses) }),
    );
  }
  if (summary.approvedDonations > 0) {
    compactMoneyParts.push(
      t("review.summary.compactMoney.donations", { amount: fmt(summary.approvedDonations) }),
    );
  }

  return (
    <div className="space-y-4 md:space-y-6" data-onboarding="import-review">
      <div className="max-md:hidden space-y-1.5">
        <h2 className="text-lg font-semibold leading-snug">{t("review.title2")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("review.lead")}</p>
      </div>

      {/* Mobile: plain two-line summary only — no inner card frame. */}
      <div className="md:hidden space-y-1" data-testid="mobile-compact-summary">
        <p className="text-[15px] font-bold leading-snug">
          {compactCountParts.join(" · ")}
        </p>
        {compactMoneyParts.length > 0 && (
          <p
            className={cn(
              "text-[13.5px] text-muted-foreground leading-snug",
              PH_SENSITIVE_PROPS.className,
            )}
            data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
          >
            {compactMoneyParts.join(" · ")}
          </p>
        )}
      </div>

      <div className="hidden md:block">
        <ImportReviewSummary summary={summary} />
      </div>

      <div className="hidden md:flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => startTransition(onToggleAllReady)}>
          {t("review.actions.selectAllReady")}
        </Button>
        <Button variant="outline" size="sm" onClick={onClearSelection}>
          {t("review.actions.clearSelection")}
        </Button>
      </div>

      {/* pe-14 leaves room for B4b's select button on mobile */}
      <div className="relative pe-14 md:pe-0">
        <div
          className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar"
          role="tablist"
        >
          {filterButtons.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`h-10 shrink-0 rounded-full px-3 text-sm transition-colors ${
                filter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
              {count > 0 && (
                <span className="ms-1.5 tabular-nums">({count})</span>
              )}
            </button>
          ))}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-14 w-8 bg-gradient-to-l from-background to-transparent md:hidden rtl:bg-gradient-to-r"
        />
      </div>

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
