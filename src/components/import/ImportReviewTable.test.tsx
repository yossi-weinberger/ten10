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
    i18n: { language: "en", dir: () => "ltr" },
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

vi.mock("./ImportRowEditModal", () => ({
  ImportRowEditModal: () => null,
}));

import { ImportReviewTable } from "./ImportReviewTable";

function row(overrides: Partial<ImportPreviewRow> = {}): ImportPreviewRow {
  return {
    id: "r1",
    rowNumber: 3,
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
      description: "Desk",
      category: null,
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

afterEach(() => cleanup());

describe("ImportReviewTable B4a", () => {
  it("uses selectRowAria and keeps the desktop edit button", () => {
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

    expect(
      screen.getByRole("checkbox", { name: 'review.selectRowAria:{"row":3}' }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "review.editRow" })).toBeInTheDocument();
    expect(screen.queryByText("Select row")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Row /)).not.toBeInTheDocument();
  });
});
