// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImportPreviewRow } from "@/lib/import/import-session.types";

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (ns === "transactions" && key.startsWith("transactionForm.transactionType.")) {
        return key.slice("transactionForm.transactionType.".length);
      }
      if (opts && Object.keys(opts).length > 0) {
        return `${key}:${JSON.stringify(opts)}`;
      }
      return key;
    },
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (isoDate: string) => ({ primary: isoDate, secondary: null }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (
    select: (state: { settings: { defaultCurrency: string } }) => unknown,
  ) => select({ settings: { defaultCurrency: "ILS" } }),
}));

vi.mock("@/lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));

vi.mock("@/lib/category-registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/category-registry")>();
  return {
    ...actual,
    formatCategory: (
      _base: "income" | "expense" | undefined | null,
      value: string | null | undefined,
    ) => (value === "food" ? "מזון" : value ?? ""),
  };
});

vi.mock("./ImportRowEditModal", () => ({
  ImportRowEditModal: () => null,
}));

import { ImportReviewTable } from "./ImportReviewTable";

function row(
  overrides: Partial<ImportPreviewRow> & {
    normalized?: Partial<NonNullable<ImportPreviewRow["normalized"]>>;
  } = {},
): ImportPreviewRow {
  const { normalized, ...rest } = overrides;
  return {
    id: "r1",
    rowNumber: 3,
    raw: {},
    mapped: {},
    status: "ready",
    issues: [],
    approved: true,
    ...rest,
    normalized: {
      date: "2026-01-15",
      amount: 100,
      currency: "ILS",
      type: "expense",
      description: "Desk",
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
      ...normalized,
    },
  };
}

afterEach(() => cleanup());

describe("ImportReviewTable category labels", () => {
  it("shows the localized label for a known category key", () => {
    render(
      <ImportReviewTable
        rows={[row()]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    expect(screen.getByText("מזון")).toBeInTheDocument();
    expect(screen.queryByText("food")).not.toBeInTheDocument();
  });

  it("shows a custom category name as-is", () => {
    render(
      <ImportReviewTable
        rows={[row({ normalized: { category: "Gym Membership" } })]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    expect(screen.getByText("Gym Membership")).toBeInTheDocument();
  });
});
