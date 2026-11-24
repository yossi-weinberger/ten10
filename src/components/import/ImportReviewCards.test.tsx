// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

  it("uses the bulk select label in select mode", () => {
    render(
      <ImportReviewCards
        rows={[row({ id: "r1", rowNumber: 4, approved: false })]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
        selectMode
        selectedIds={new Set()}
        onToggleSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("checkbox", { name: 'review.bulk.selectRowAria:{"row":4}' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: 'review.bulk.selectRowAria:{"row":4}' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /review\.selectRowAria:/ })).not.toBeInTheDocument();
  });

  it("keeps every card the same height and announces status without a wrapping chip", () => {
    const { container } = render(
      <ImportReviewCards
        rows={[
          row({ id: "ready", rowNumber: 1, status: "ready" }),
          row({
            id: "review",
            rowNumber: 2,
            status: "needs_review",
            issues: [{ code: "possible_duplicate" }],
          }),
          row({
            id: "bad",
            rowNumber: 3,
            status: "invalid",
            issues: [{ code: "invalid_amount" }],
            normalized: {
              date: "2026-01-15",
              amount: 10,
              currency: "ILS",
              type: null,
              description: "Refund",
              category: null,
              recipient: "Very long recipient name",
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
          }),
        ]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    const cards = container.querySelectorAll("[data-swipe-row]");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.querySelector("[class*='h-[54px]']")).not.toBeNull();
      expect(card.innerHTML).not.toContain("flex-wrap");
    }
    expect(screen.getByText("status.needs_review")).toHaveClass("sr-only");
    expect(screen.getByText("status.invalid")).toHaveClass("sr-only");
    expect(screen.getByText("Very long recipient name")).toBeInTheDocument();
  });

  it("shows how many eligible rows will be imported, including zero", () => {
    render(
      <ImportReviewCards
        rows={[row({ id: "r1", rowNumber: 1, approved: false })]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    expect(screen.getByText(/review\.selection\.willImport:/)).toHaveTextContent('"selected":0');
    expect(screen.getByText(/review\.selection\.willImport:/)).toHaveTextContent('"count":1');
  });
});

function phoneMatchMedia(query: string) {
  return {
    matches: query === "(pointer: coarse)" || query.includes("max-width: 767px"),
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  };
}

function swipeOpen(card: HTMLElement) {
  fireEvent.pointerDown(card, { clientX: 40, clientY: 20, pointerType: "touch" });
  fireEvent.pointerMove(card, { clientX: 160, clientY: 20, pointerType: "touch" });
  fireEvent.pointerUp(card, { clientX: 160, clientY: 20, pointerType: "touch" });
}

describe("ImportReviewCards swipe", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete document.body.dataset.mobileSwipeOpen;
  });

  it("includes or excludes from the swipe strip and covers the assistant", () => {
    vi.stubGlobal("matchMedia", phoneMatchMedia);
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

    const card = screen.getByRole("button", { name: /review\.editRowAria:.*"row":1/ });
    fireEvent.pointerDown(card, { clientX: 40, clientY: 20, pointerType: "touch" });
    fireEvent.pointerMove(card, { clientX: 40, clientY: 80, pointerType: "touch" });
    expect(document.body.dataset.mobileSwipeOpen).toBeUndefined();

    fireEvent.pointerUp(card, { clientX: 40, clientY: 80, pointerType: "touch" });
    swipeOpen(card);

    expect(document.body.dataset.mobileSwipeOpen).toBe("true");
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "review.swipe.include" }));
    expect(onToggle).toHaveBeenCalledWith("r1", true);
  });

  it("does not swipe in select mode and ignores a long press", () => {
    vi.stubGlobal("matchMedia", phoneMatchMedia);
    vi.useFakeTimers();
    const onToggleSelect = vi.fn();
    render(
      <ImportReviewCards
        rows={[row({ id: "r1", rowNumber: 1 })]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
        selectMode
        selectedIds={new Set()}
        onToggleSelect={onToggleSelect}
      />,
    );

    const card = screen.getByRole("button", { name: /review\.bulk\.selectRowAria:.*"row":1/ });
    swipeOpen(card);
    expect(document.body.dataset.mobileSwipeOpen).toBeUndefined();

    fireEvent.pointerDown(card, { clientX: 40, clientY: 20, pointerType: "touch" });
    vi.advanceTimersByTime(500);
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it("disables include and edit on an invalid row", () => {
    vi.stubGlobal("matchMedia", phoneMatchMedia);
    render(
      <ImportReviewCards
        rows={[
          row({
            id: "bad",
            rowNumber: 2,
            status: "invalid",
            approved: false,
            issues: [{ code: "invalid_amount" }],
          }),
        ]}
        onToggleApproval={vi.fn()}
        onBulkToggle={vi.fn()}
        onUpdateRow={vi.fn()}
        existingTransactions={[]}
        recurringTransactions={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "review.editRow", hidden: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: "review.swipe.include", hidden: true })).toBeDisabled();
  });
});
