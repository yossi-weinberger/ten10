// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
  ImportRowEditModal: ({
    isOpen,
    row,
  }: {
    isOpen: boolean;
    row: ImportPreviewRow | null;
  }) => (isOpen && row ? <div role="dialog">edit-{row.id}</div> : null),
}));

import { ImportReviewCards } from "./ImportReviewCards";

function row(overrides: Partial<ImportPreviewRow> & { id: string; rowNumber: number }): ImportPreviewRow {
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
      description: "Coffee shop",
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

afterEach(() => cleanup());

describe("ImportReviewCards B4a", () => {
  it("opens the edit modal when the card body is tapped", async () => {
    const user = userEvent.setup();
    render(
      <ImportReviewCards
        rows={[row({ id: "r1", rowNumber: 1 })]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /review\.editRowAria:.*"row":1/,
      }),
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("edit-r1");
  });

  it("does not open edit when the checkbox is toggled", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ImportReviewCards
        rows={[row({ id: "r1", rowNumber: 1, approved: false })]}
        onToggleApproval={onToggle}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    await user.click(
      screen.getByRole("checkbox", {
        name: 'review.selectRowAria:{"row":1}',
      }),
    );
    expect(onToggle).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the localized category label for a known key after edit", () => {
    render(
      <ImportReviewCards
        rows={[row({ id: "r1", rowNumber: 1 })]}
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

  it("hides the ready status badge and shows needs_review", () => {
    render(
      <ImportReviewCards
        rows={[
          row({ id: "ready", rowNumber: 1, status: "ready" }),
          row({
            id: "review",
            rowNumber: 2,
            status: "needs_review",
            issues: [{ code: "possible_duplicate" }],
          }),
        ]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    expect(screen.queryByText("status.ready")).not.toBeInTheDocument();
    expect(screen.getByText("status.needs_review")).toBeInTheDocument();
  });

  it("masks the amount panel text for PostHog replay", () => {
    const { container } = render(
      <ImportReviewCards
        rows={[row({ id: "r1", rowNumber: 1 })]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const masked = [...container.querySelectorAll(".ph-mask[data-ph-mask]")];
    expect(masked.some((el) => /100|₪/.test(el.textContent ?? ""))).toBe(true);
  });

  it("uses localized select/edit aria keys", () => {
    render(
      <ImportReviewCards
        rows={[row({ id: "r1", rowNumber: 7, normalized: {
          date: "2026-01-15",
          amount: 10,
          currency: "ILS",
          type: "income",
          description: "Salary",
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
        } })]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const editButton = screen.getByRole("button", {
      name: 'review.editRowAria:{"row":7}',
    });
    expect(
      screen.getByRole("checkbox", { name: 'review.selectRowAria:{"row":7}' }),
    ).toBeInTheDocument();
    expect(editButton).toBeInTheDocument();
    expect(editButton.getAttribute("aria-label") ?? "").not.toMatch(/Salary/i);
    expect(editButton.getAttribute("aria-label") ?? "").not.toMatch(/10/);
  });
});
