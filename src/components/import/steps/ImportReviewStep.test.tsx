// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportPreviewRow, ImportSummary } from "@/lib/import/import-session.types";

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

vi.mock("../ImportReviewTable", () => ({
  ImportReviewTable: () => <div data-testid="desktop-table">desktop-table</div>,
}));

vi.mock("../ImportReviewCards", () => ({
  ImportReviewCards: () => <div data-testid="mobile-cards">mobile-cards</div>,
}));

vi.mock("../ImportReviewSummary", () => ({
  ImportReviewSummary: () => <div data-testid="desktop-summary">desktop-summary</div>,
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

const rows: ImportPreviewRow[] = [];

const noop = () => {};

beforeEach(() => {
  // Ensure md:hidden / hidden md:block classes are present for assertion.
});

afterEach(() => cleanup());

describe("ImportReviewStep B4a", () => {
  it("omits zero review/invalid parts from the compact summary", () => {
    render(
      <ImportReviewStep
        rows={rows}
        summary={summary({ needsReview: 0, invalid: 0, approvedDonations: 0 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const compact = screen.getByTestId("mobile-compact-summary");
    expect(compact.className).toContain("md:hidden");
    expect(compact.className).not.toMatch(/rounded|border|bg-white|px-|py-/);
    expect(compact.textContent).toContain("review.summary.compactCountsTotal");
    expect(compact.textContent).toContain("review.summary.compactCountsReady");
    expect(compact.textContent).not.toContain("compactCountsReview");
    expect(compact.textContent).not.toContain("compactCountsInvalid");
    expect(compact.textContent).not.toContain("לבדיקה");
    expect(compact.textContent).toContain("compactMoney.income");
    expect(compact.textContent).toContain("compactMoney.expenses");
    expect(compact.textContent).not.toContain("compactMoney.donations");
  });

  it("includes review and invalid parts when non-zero", () => {
    render(
      <ImportReviewStep
        rows={rows}
        summary={summary({ needsReview: 2, invalid: 1, approvedDonations: 20 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const compact = screen.getByTestId("mobile-compact-summary");
    expect(compact.textContent).toContain("compactCountsReview");
    expect(compact.textContent).toContain("compactCountsInvalid");
    expect(compact.textContent).toContain("compactMoney.donations");
  });

  it("masks compact money totals for PostHog replay", () => {
    render(
      <ImportReviewStep
        rows={rows}
        summary={summary({ approvedIncome: 100, approvedExpenses: 50 })}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const compact = screen.getByTestId("mobile-compact-summary");
    const maskedMoney = compact.querySelector(".ph-mask[data-ph-mask]");
    expect(maskedMoney).toBeTruthy();
    expect(maskedMoney?.textContent).toContain("compactMoney.income");
  });

  it("hides title and lead below md and keeps desktop intro identical at md+", () => {
    const { container } = render(
      <ImportReviewStep
        rows={rows}
        summary={summary()}
        onToggleApproval={noop}
        onBulkToggle={noop}
        onToggleAllReady={noop}
        onClearSelection={noop}
        onUpdateRow={noop}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const title = screen.getByText("review.title2");
    const lead = screen.getByText("review.lead");
    const intro = title.closest("div");
    expect(intro?.className).toContain("max-md:hidden");
    expect(lead.closest("div")).toBe(intro);

    const compact = screen.getByTestId("mobile-compact-summary");
    expect(compact.className).toContain("md:hidden");
    expect(container.querySelector(".md\\:hidden.rounded-\\[10px\\]")).toBeNull();

    expect(screen.getByTestId("desktop-summary")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-table")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-cards")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "review.actions.selectAllReady" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "review.actions.clearSelection" })).toBeInTheDocument();
  });
});
