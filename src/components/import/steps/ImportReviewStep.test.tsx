// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImportPreviewRow, ImportSummary } from "@/lib/import/import-session.types";
import heImport from "../../../../public/locales/he/import.json";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && Object.keys(opts).length > 0) {
        return `${key}:${JSON.stringify(opts)}`;
      }
      return key;
    },
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (
    select: (state: { settings: { defaultCurrency: string } }) => unknown,
  ) => select({ settings: { defaultCurrency: "ILS" } }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (isoDate: string) => ({ primary: isoDate, secondary: null }),
}));

vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));

vi.mock("@/lib/import/bulk-edit", () => ({
  applyBulkEdit: vi.fn(
    (
      rows: ImportPreviewRow[],
      ids: string[],
      patch: { type?: ImportPreviewRow["normalized"] extends { type: infer T } | undefined ? T : never },
    ): ImportPreviewRow[] => {
      const idSet = new Set(ids);
      return rows.map((row) => {
        if (!idSet.has(row.id) || !row.normalized || !patch.type) return row;
        const nextType = patch.type;
        return {
          ...row,
          normalized: { ...row.normalized, type: nextType },
          status: nextType === "donation" ? ("invalid" as const) : ("ready" as const),
          approved: nextType === "donation" ? false : row.approved,
        };
      });
    },
  ),
}));

vi.mock("@/components/TransactionsTable/BulkActionsToolbar", () => ({
  BulkActionsToolbar: ({
    selectedCountLabel,
    selectedCountAnnouncement,
    editLabel,
    clearLabel,
    onEdit,
    onClear,
    onDelete,
    mobileLayout,
  }: {
    selectedCountLabel: string;
    selectedCountAnnouncement?: string;
    editLabel: string;
    clearLabel: string;
    onEdit: () => void;
    onClear: () => void;
    onDelete?: () => void;
    mobileLayout?: boolean;
  }) => (
    <div
      data-testid={mobileLayout ? "mobile-bulk-toolbar" : "desktop-bulk-toolbar"}
      role="region"
      aria-live="polite"
    >
      {selectedCountAnnouncement ? (
        <span className="sr-only">{selectedCountAnnouncement}</span>
      ) : null}
      <span aria-hidden={selectedCountAnnouncement ? true : undefined}>
        {selectedCountLabel}
      </span>
      <button type="button" onClick={onEdit}>
        {editLabel}
      </button>
      <button type="button" onClick={onClear}>
        {clearLabel}
      </button>
      {onDelete ? <button type="button">delete</button> : null}
    </div>
  ),
}));

vi.mock("@/components/TransactionsTable/BulkEditDialog", () => ({
  BulkEditDialog: ({
    open,
    title,
    submitLabel,
    submitDisabled,
    onSubmit,
    children,
  }: {
    open: boolean;
    title: string;
    submitLabel: string;
    submitDisabled?: boolean;
    onSubmit: () => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
        <button type="button" disabled={submitDisabled} onClick={onSubmit}>
          {submitLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("../ImportBulkEditFields", () => ({
  ImportBulkEditFields: ({
    onTypeChange,
  }: {
    onTypeChange: (type: string) => void;
  }) => (
    <>
      <button type="button" onClick={() => onTypeChange("income")}>
        pick-income
      </button>
      <button type="button" onClick={() => onTypeChange("donation")}>
        pick-donation
      </button>
    </>
  ),
}));

vi.mock("../ImportReviewTable", () => ({
  ImportReviewTable: ({
    selectMode,
    selectedIds,
    onToggleSelect,
    onSelectAllVisible,
    rows,
  }: {
    selectMode?: boolean;
    selectedIds?: ReadonlySet<string>;
    onToggleSelect?: (id: string) => void;
    onSelectAllVisible?: () => void;
    rows: ImportPreviewRow[];
  }) => (
    <div data-testid="desktop-table">
      <span data-testid="table-select-mode">{String(!!selectMode)}</span>
      <span data-testid="table-selected-count">{selectedIds?.size ?? 0}</span>
      <button type="button" onClick={() => onToggleSelect?.(rows[0]?.id ?? "")}>
        toggle-first
      </button>
      <button type="button" onClick={() => onSelectAllVisible?.()}>
        select-all-visible
      </button>
    </div>
  ),
}));

vi.mock("../ImportReviewCards", () => ({
  ImportReviewCards: ({
    selectMode,
    selectedIds,
    onToggleSelect,
    rows,
  }: {
    selectMode?: boolean;
    selectedIds?: ReadonlySet<string>;
    onToggleSelect?: (id: string) => void;
    rows: ImportPreviewRow[];
  }) => (
    <div data-testid="mobile-cards">
      <span data-testid="cards-select-mode">{String(!!selectMode)}</span>
      <span data-testid="cards-selected-count">{selectedIds?.size ?? 0}</span>
      <button type="button" onClick={() => onToggleSelect?.(rows[0]?.id ?? "")}>
        toggle-card-first
      </button>
    </div>
  ),
}));

vi.mock("../ImportReviewSummary", () => ({
  ImportReviewSummary: ({ summary }: { summary: ImportSummary }) => (
    <div data-testid="desktop-summary">approved:{summary.approved}</div>
  ),
}));

import { ImportReviewStep } from "./ImportReviewStep";

function summary(overrides: Partial<ImportSummary> = {}): ImportSummary {
  return {
    total: 10,
    ready: 8,
    invalid: 0,
    needsReview: 0,
    duplicateWarnings: 0,
    recurringWarnings: 0,
    issueCounts: {},
    approved: 8,
    approvedIncome: 100,
    approvedExpenses: 50,
    approvedDonations: 0,
    dateRangeMin: "2026-01-01",
    dateRangeMax: "2026-01-31",
    ...overrides,
  };
}

function previewRow(
  overrides: Partial<ImportPreviewRow> & { id: string; rowNumber: number },
): ImportPreviewRow {
  return {
    raw: {},
    mapped: {},
    status: "ready",
    issues: [],
    approved: true,
    normalized: {
      date: "2026-01-15",
      amount: 100,
      currency: "ILS",
      type: "expense",
      description: "Coffee",
      category: "food",
      recipient: null,
      payment_method: null,
      is_chomesh: false,
      original_amount: null,
      original_currency: null,
      conversion_rate: null,
      conversion_date: null,
      rate_source: null,
      source_recurring_id: null,
      occurrence_number: null,
    },
    ...overrides,
  };
}

const noop = () => {};

afterEach(() => cleanup());

describe("ImportReviewStep B4a", () => {
  it("omits zero review/invalid parts from the compact summary", () => {
    const { container } = render(
      <ImportReviewStep
        rows={[]}
        summary={summary({ needsReview: 0, invalid: 0, approvedDonations: 0 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const compact = container.querySelector(".md\\:hidden.rounded-\\[10px\\]");
    expect(compact).toBeTruthy();
    expect(compact?.textContent).toContain("review.summary.compactCountsTotal");
    expect(compact?.textContent).toContain("review.summary.compactCountsReady");
    expect(compact?.textContent).not.toContain("compactCountsReview");
    expect(compact?.textContent).not.toContain("compactCountsInvalid");
    expect(compact?.textContent).toContain("compactMoney.income");
    expect(compact?.textContent).toContain("compactMoney.expenses");
    expect(compact?.textContent).not.toContain("compactMoney.donations");
  });

  it("includes review and invalid parts when non-zero", () => {
    const { container } = render(
      <ImportReviewStep
        rows={[]}
        summary={summary({ needsReview: 2, invalid: 1, approvedDonations: 20 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const compact = container.querySelector(".md\\:hidden.rounded-\\[10px\\]");
    expect(compact?.textContent).toContain("compactCountsReview");
    expect(compact?.textContent).toContain("compactCountsInvalid");
    expect(compact?.textContent).toContain("compactMoney.donations");
  });

  it("masks compact money totals for PostHog replay", () => {
    const { container } = render(
      <ImportReviewStep
        rows={[]}
        summary={summary({ approvedIncome: 100, approvedExpenses: 50 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const compact = container.querySelector(".md\\:hidden.rounded-\\[10px\\]");
    const maskedMoney = compact?.querySelector(".ph-mask[data-ph-mask]");
    expect(maskedMoney).toBeTruthy();
    expect(maskedMoney?.textContent).toContain("compactMoney.income");
  });

  it("keeps the desktop summary cards and table wrappers", () => {
    render(
      <ImportReviewStep
        rows={[]}
        summary={summary()}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    expect(screen.getByTestId("desktop-summary")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-table")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-cards")).toBeInTheDocument();
    expect(screen.getByText("review.title2")).toBeInTheDocument();
    expect(screen.getByText("review.lead")).toBeInTheDocument();
  });
});

describe("ImportReviewStep B4b select mode", () => {
  const rows = [
    previewRow({ id: "a", rowNumber: 1 }),
    previewRow({ id: "b", rowNumber: 2 }),
    previewRow({
      id: "bad",
      rowNumber: 3,
      status: "invalid",
      approved: false,
    }),
  ];

  it("enters and exits select mode", async () => {
    const onSelectModeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ImportReviewStep
        rows={rows}
        summary={summary({ total: 3, ready: 2, invalid: 1, approved: 2 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={noop}
        onSelectModeChange={onSelectModeChange}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    expect(screen.getByTestId("cards-select-mode")).toHaveTextContent("false");
    await user.click(screen.getAllByRole("button", { name: "review.bulk.enter" })[0]!);
    expect(onSelectModeChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("cards-select-mode")).toHaveTextContent("true");
    expect(screen.getByText(/review.bulk.selectAllVisible/)).toBeInTheDocument();
    expect(screen.queryByText("review.title2")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "review.bulk.done" })[0]!);
    expect(onSelectModeChange).toHaveBeenCalledWith(false);
    expect(screen.getByTestId("cards-select-mode")).toHaveTextContent("false");
    expect(screen.getByText("review.title2")).toBeInTheDocument();
  });

  it("select-all-visible skips invalid rows", async () => {
    const user = userEvent.setup();

    render(
      <ImportReviewStep
        rows={rows}
        summary={summary({ total: 3, ready: 2, invalid: 1, approved: 2 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "review.bulk.enter" })[0]!);
    await user.click(screen.getByRole("button", { name: "select-all-visible" }));

    expect(screen.getByTestId("table-selected-count")).toHaveTextContent("2");
    expect(screen.getByTestId("cards-selected-count")).toHaveTextContent("2");
  });

  it("notifies the parent so the sticky footer can hide in select mode", async () => {
    const onSelectModeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <ImportReviewStep
        rows={rows}
        summary={summary({ total: 3, ready: 2, invalid: 1, approved: 2 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={noop}
        onSelectModeChange={onSelectModeChange}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "review.bulk.enter" })[0]!);
    expect(onSelectModeChange).toHaveBeenLastCalledWith(true);
  });

  it("applies bulk edit, exits select mode, and shows a status line", async () => {
    const onBulkUpdateRows = vi.fn();
    const user = userEvent.setup();

    render(
      <ImportReviewStep
        rows={rows}
        summary={summary({ total: 3, ready: 2, invalid: 1, approved: 2 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={onBulkUpdateRows}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "review.bulk.enter" })[0]!);
    await user.click(screen.getByRole("button", { name: "toggle-first" }));
    expect(screen.getByTestId("mobile-bulk-toolbar")).toBeInTheDocument();
    expect(within(screen.getByTestId("mobile-bulk-toolbar")).queryByText("delete")).not.toBeInTheDocument();

    await user.click(
      within(screen.getByTestId("mobile-bulk-toolbar")).getByRole("button", {
        name: "review.bulk.editAction",
      }),
    );

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "pick-income" }));
    await user.click(within(dialog).getByRole("button", { name: /review.bulk.apply/ }));

    expect(onBulkUpdateRows).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("cards-select-mode")).toHaveTextContent("false");
    expect(screen.getByText(/review.bulk.applied/)).toBeInTheDocument();
    expect(screen.queryByText(/review.bulk.becameInvalid/)).not.toBeInTheDocument();
  });

  it("shows becameInvalid in the status line when stubbed revalidation marks rows invalid", async () => {
    const onBulkUpdateRows = vi.fn();
    const user = userEvent.setup();

    render(
      <ImportReviewStep
        rows={rows}
        summary={summary({ total: 3, ready: 2, invalid: 1, approved: 2 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        onBulkUpdateRows={onBulkUpdateRows}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "review.bulk.enter" })[0]!);
    await user.click(screen.getByRole("button", { name: "toggle-first" }));
    await user.click(
      within(screen.getByTestId("mobile-bulk-toolbar")).getByRole("button", {
        name: "review.bulk.editAction",
      }),
    );

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "pick-donation" }));
    await user.click(within(dialog).getByRole("button", { name: /review.bulk.apply/ }));

    expect(onBulkUpdateRows).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/review.bulk.applied/)).toBeInTheDocument();
    expect(screen.getByText(/review.bulk.becameInvalid/)).toBeInTheDocument();
  });
});

describe("review.bulk Hebrew dual forms", () => {
  function hePluralSuffix(count: number): "one" | "two" | "many" | "other" {
    const rule = new Intl.PluralRules("he").select(count);
    if (rule === "one" || rule === "two" || rule === "many" || rule === "other") {
      return rule;
    }
    return "other";
  }

  it("defines _two keys for every pluralized bulk string used at count=2", () => {
    expect(hePluralSuffix(2)).toBe("two");
    const bulk = heImport.review.bulk as Record<string, string>;
    for (const key of [
      "count",
      "countAnnouncement",
      "edit",
      "sheetTitle",
      "apply",
      "applied",
      "becameInvalid",
    ]) {
      expect(bulk[`${key}_two`], `missing review.bulk.${key}_two`).toBeTypeOf("string");
      expect(bulk[`${key}_two`], `raw key for ${key}_two`).not.toMatch(
        new RegExp(`${key}_two`),
      );
    }
    expect(bulk.count_two).toBe("שתיים נבחרו");
    expect(bulk.countAnnouncement_two).toBe("נבחרו שתי שורות");
    expect(bulk.edit_two).toBe("עריכת שתי תנועות");
    expect(bulk.sheetTitle_two).toBe("עריכת שתי תנועות");
    expect(bulk.apply_two).toBe("החלה על שתי תנועות");
    expect(bulk.applied_two).toBe("עודכנו שתי תנועות");
    expect(bulk.becameInvalid_two).toBe(
      'שתיים מהן צריכות תיקון. אפשר לסנן "לא תקין".',
    );
  });
});

describe("review.bulk countAnnouncement live region (HE)", () => {
  function heAnnouncement(count: number): string {
    const rule = new Intl.PluralRules("he").select(count);
    const bulk = heImport.review.bulk as Record<string, string>;
    const template =
      bulk[`countAnnouncement_${rule}`] ?? bulk.countAnnouncement_other;
    return template.replace(/\{\{\s*count\s*\}\}/g, String(count));
  }

  it.each([
    [1, "נבחרה שורה אחת"],
    [2, "נבחרו שתי שורות"],
    [5, "נבחרו 5 שורות"],
  ] as const)(
    "resolves a full live-region sentence for count %i",
    (count, expected) => {
      expect(heAnnouncement(count)).toBe(expected);
    },
  );
});
