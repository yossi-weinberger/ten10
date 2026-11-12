// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, fireEvent, waitFor, cleanup, within, act } from "@testing-library/react";
import { formatCurrency } from "@/lib/utils/currency";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TransactionCardList } from "./TransactionCardList";
import type { TransactionForTable } from "@/types/transaction";

const i18nDir = vi.hoisted(() => ({ current: "ltr" as "ltr" | "rtl" }));
const reducedMotion = vi.hoisted(() => ({ current: false }));
const displayDateSecondary = vi.hoisted(() => ({ current: null as string | null }));

vi.mock("framer-motion", () => ({
  useReducedMotion: () => reducedMotion.current,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: { date?: string }) => {
      if (key === "types.income") return "Income";
      if (key === "types.expense") return "Expense";
      if (key === "types.donation") return "Donation";
      if (key === "types.exempt-income") return "Exempt Income";
      if (key === "types.recognized-expense") return "Recognized Expense";
      if (key === "types.non_tithe_donation") return "Non-Tithe Donation";
      if (key === "types.initial_balance") return "Opening Balance";
      if (key === "messages.noData") return "No transactions found";
      if (key === "messages.defaultTransactionName") return "this transaction";
      if (key === "columns.date") return "Date";
      if (key === "columns.amount") return "Amount";
      if (key === "columns.type") return "Type";
      if (key === "columns.category") return "Category";
      if (key === "columns.recipient") return "Recipient";
      if (key === "columns.paymentMethod") return "Payment Method";
      if (key === "columns.chomesh") return "Chomesh";
      if (key === "columns.recurring") return "Recurring";
      if (key === "cards.chomesh") return "Chomesh";
      if (key === "actions.edit") return "Edit";
      if (key === "actions.delete") return "Delete";
      if (key === "actions.cancel") return "Cancel";
      if (key === "actions.editRecurring") return "Edit Recurring";
      if (key === "actions.viewReceipt") return "View Receipt";
      if (key === "actions.receiptUntil") return `expires ${params?.date || ""}`;
      if (key === "actions.undoAi") return "Undo AI";
      if (key === "messages.loading") return "Loading...";
      if (key === "modal.editDescription") return "Update transaction details";
      if (key === "drawer.detailsDescription") return "Transaction details and actions";
      if (key === "drawer.editRecurring") return "Edit link";
      if (key === "drawer.convertedPrefix") return "Converted · ";
      if (key === "row.tooltip.original") return "Original Amount";
      if (key === "row.tooltip.rate") return "Exchange Rate";
      if (key === "row.tooltip.converted") return "Converted Amount";
      return key;
    },
    i18n: {
      language: "en",
      dir: () => i18nDir.current,
    },
  }),
}));

vi.mock("@/lib/calendar/calendar-preview", () => ({
  useEffectiveCalendarType: () => "gregorian",
}));

vi.mock("@/lib/calendar/calendar-period", () => ({
  getCalendarMonthKey: (date: string) => date.substring(0, 7),
  isCalendarMonthTransition: (prev: string | null, date: string) => {
    if (!prev) return true;
    return prev.substring(0, 7) !== date.substring(0, 7);
  },
  formatCalendarMonthLabel: (key: string) => key,
}));

vi.mock("@/lib/category-registry", () => ({
  formatCategory: (
    _family: string | undefined,
    category: string | null,
    _language: string,
    fallback: string
  ) => category || fallback,
}));

vi.mock("@/lib/payment-methods", () => ({
  formatPaymentMethod: (
    method: string | null,
    _language: string,
    fallback: string
  ) => method || fallback,
}));

vi.mock("@/lib/utils/formatting", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
  formatBoolean: (value: boolean | null) => (value ? "Yes" : "No"),
}));

vi.mock("@/lib/calendar/use-display-date", () => ({
  useDisplayDate: () => (date: string) => ({
    primary: date,
    secondary: displayDateSecondary.current,
  }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@/lib/ai/ai-undo-eligibility", () => ({
  canUndoAiTransaction: (transaction: { origin?: string | null }) => 
    transaction.origin === "ai" || transaction.origin === "ai_auto",
}));

vi.mock("@/lib/ai/flags", () => ({
  isAiIntakeEnabled: () => true,
}));

vi.mock("@/lib/ai/open-receipt", () => ({
  openAiReceipt: vi.fn().mockResolvedValue({ status: "none" }),
}));

vi.mock("@/lib/ai/receipt-action", () => ({
  showReceiptAction: ({ expiresAt }: { platform: string; enabled: boolean; expiresAt?: string | null }) => 
    !!expiresAt,
  receiptExpiryDate: (expiresAt: string) => expiresAt,
}));

const mockUseDonationStore = vi.fn();
vi.mock("@/lib/store", () => ({
  useDonationStore: (selector: (state: { settings: { trackChomeshSeparately: boolean } }) => boolean) => 
    mockUseDonationStore(selector),
}));

vi.mock("@/components/Currency/CurrencyConversionInfo", () => ({
  CurrencyConversionInfo: ({ amount, currency }: { amount: number; currency: string }) => (
    <span>{`${amount} ${currency}`}</span>
  ),
}));

vi.mock("./RecurringProgressBadge", () => ({
  RecurringProgressBadge: () => <span>Recurring Badge</span>,
}));

const mockTransactions: TransactionForTable[] = [
  {
    id: "1",
    user_id: "user1",
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-01T10:00:00Z",
    date: "2026-11-01",
    amount: 500,
    currency: "ILS",
    description: "Salary",
    type: "income",
    category: "Salary",
    is_chomesh: false,
    recipient: null,
    payment_method: "Bank Transfer",
    recurring_info: null,
  },
  {
    id: "2",
    user_id: "user1",
    created_at: "2026-11-05T14:00:00Z",
    updated_at: "2026-11-05T14:00:00Z",
    date: "2026-11-05",
    amount: 200,
    currency: "ILS",
    description: "Groceries",
    type: "expense",
    category: "Food",
    is_chomesh: false,
    recipient: "SuperMarket",
    payment_method: "Credit Card",
    recurring_info: null,
  },
  {
    id: "3",
    user_id: "user1",
    created_at: "2026-11-10T09:00:00Z",
    updated_at: "2026-11-10T09:00:00Z",
    date: "2026-11-10",
    amount: 100,
    currency: "ILS",
    description: "Charity",
    type: "donation",
    category: "Tzedakah",
    is_chomesh: true,
    recipient: "Local Charity",
    payment_method: "Cash",
    recurring_info: {
      status: "active",
      frequency: "monthly",
      execution_count: 3,
      total_occurrences: 12,
      day_of_month: 10,
      start_date: "2026-09-10",
      next_due_date: "2026-12-10",
      calendar_type: "gregorian",
      anchor_month_code: null,
    },
    source_recurring_id: "rec1",
    occurrence_number: 3,
  },
];

describe("TransactionCardList", () => {
  beforeEach(() => {
    displayDateSecondary.current = null;
    mockUseDonationStore.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders cards with correct type tint for income", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("border-green-200/70");
    expect(markup).toContain("bg-green-50");
    expect(markup).toContain("dark:border-green-900/60");
    expect(markup).toContain("dark:bg-green-950");
    expect(markup).toContain("Salary");
    expect(markup).toContain("500 ILS");
  });

  it("renders cards with correct type tint for expense", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[1]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("border-red-200/70");
    expect(markup).toContain("bg-red-50");
    expect(markup).toContain("dark:border-red-900/60");
    expect(markup).toContain("dark:bg-red-950");
    expect(markup).toContain("Groceries");
    expect(markup).toContain("200 ILS");
  });

  it("renders cards with correct type tint for donation", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[2]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("border-yellow-200/80");
    expect(markup).toContain("bg-yellow-50");
    expect(markup).toContain("dark:border-yellow-900/60");
    expect(markup).toContain("dark:bg-yellow-950");
    expect(markup).toContain("Charity");
    expect(markup).toContain("100 ILS");
  });

  it("masks description, category, and amount with PostHog masking classes", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("ph-mask ph-sensitive");
    expect(markup).toContain('data-ph-mask=""');
  });

  it("shows recurring indicator for recurring transactions", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[2]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Charity");
    expect(markup).toContain("Tzedakah");
  });

  it("shows empty state when no transactions", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("No transactions found");
  });

  it("shows loading skeleton when loading", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={true}
      />
    );

    expect(markup).toContain("animate-pulse");
  });

  it("renders month separators", () => {
    const transactionsInDifferentMonths: TransactionForTable[] = [
      { ...mockTransactions[0], date: "2026-11-01" },
      { ...mockTransactions[1], date: "2026-12-05" },
    ];

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={transactionsInDifferentMonths}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("2026-11");
    expect(markup).toContain("2026-12");
    expect(markup).toContain("top-[var(--mobile-topbar-h,0px)]");
    expect(markup).not.toContain("md:top-0");
  });

  it("includes drawer with masked title in component structure", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("ph-mask ph-sensitive");
    expect(markup).toContain('data-ph-mask=""');
  });

  it("cards have keyboard navigation attributes for Enter/Space handling", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
  });

  it("drawer structure omits recipient row when value is empty", () => {
    const transactionWithoutRecipient: TransactionForTable = {
      ...mockTransactions[0],
      recipient: null,
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[transactionWithoutRecipient]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const hasRecipientLabel = markup.includes(">Recipient<");
    expect(hasRecipientLabel).toBe(false);
  });

  it("drawer structure omits payment method row when value is empty", () => {
    const transactionWithoutPaymentMethod: TransactionForTable = {
      ...mockTransactions[0],
      payment_method: null,
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[transactionWithoutPaymentMethod]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const hasPaymentMethodLabel = markup.includes(">Payment Method<");
    expect(hasPaymentMethodLabel).toBe(false);
  });

  it("drawer structure omits category row when value is empty", () => {
    const transactionWithoutCategory: TransactionForTable = {
      ...mockTransactions[0],
      category: null,
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[transactionWithoutCategory]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const hasCategoryLabel = markup.includes(">Category<");
    expect(hasCategoryLabel).toBe(false);
  });

  it("uses category as fallback title when description is empty", () => {
    const transactionWithoutDescription: TransactionForTable = {
      ...mockTransactions[0],
      description: null,
      category: "Groceries",
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[transactionWithoutDescription]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Groceries");
    expect(markup).toContain("text-muted-foreground");
  });

  it("uses type label as fallback title when both description and category are empty", () => {
    const transactionWithoutDescriptionOrCategory: TransactionForTable = {
      ...mockTransactions[0],
      description: null,
      category: null,
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[transactionWithoutDescriptionOrCategory]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Income");
    expect(markup).toContain("text-muted-foreground");
  });

  it("omits category separator when category is empty", () => {
    const transactionWithoutCategory: TransactionForTable = {
      ...mockTransactions[0],
      category: null,
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[transactionWithoutCategory]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("2026-11-01");
    expect(markup).toContain("Salary");
  });

  it("renders month header before first card", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("2026-11");
    expect(markup).toContain("sticky");
  });

  it("includes keyboard navigation attributes on cards", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
  });

  it("includes press feedback classes on cards", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("active:scale-[0.99]");
  });

  it("shows special type badge for exempt-income on card", () => {
    const exemptIncomeTransaction: TransactionForTable = {
      ...mockTransactions[0],
      type: "exempt-income",
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[exemptIncomeTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Exempt Income");
    expect(markup).toContain("bg-blue-100");
  });

  it("shows special type badge for recognized-expense on card", () => {
    const recognizedExpenseTransaction: TransactionForTable = {
      ...mockTransactions[1],
      type: "recognized-expense",
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[recognizedExpenseTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Recognized Expense");
    expect(markup).toContain("bg-rose-100");
  });

  it("shows special type badge for non_tithe_donation on card", () => {
    const nonTitheDonationTransaction: TransactionForTable = {
      ...mockTransactions[2],
      type: "non_tithe_donation",
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[nonTitheDonationTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Non-Tithe Donation");
    expect(markup).toContain("bg-orange-100");
  });

  it("shows special type badge for initial_balance on card", () => {
    const initialBalanceTransaction: TransactionForTable = {
      ...mockTransactions[0],
      type: "initial_balance",
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[initialBalanceTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Opening Balance");
    expect(markup).toContain("bg-gray-100");
  });

  it("does not show badge for plain income type", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).not.toContain("Exempt Income");
    expect(markup).not.toContain("bg-blue-100");
  });

  it("does not show badge for plain expense type", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[1]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).not.toContain("Recognized Expense");
    expect(markup).not.toContain("bg-rose-100");
  });

  it("does not show badge for plain donation type", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[2]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).not.toContain("Non-Tithe Donation");
    expect(markup).not.toContain("bg-orange-100");
  });

  it("shows chomesh indicator on card when is_chomesh is true and tracking enabled", () => {
    mockUseDonationStore.mockReturnValue(true);
    
    const chomeshTransaction: TransactionForTable = {
      ...mockTransactions[0],
      is_chomesh: true,
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[chomeshTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Chomesh");
    expect(markup).toContain("lucide-badge-check");
    expect(markup).toContain("text-green-600");
  });

  it("does not show chomesh indicator on card when tracking disabled", () => {
    mockUseDonationStore.mockReturnValue(false);
    
    const chomeshTransaction: TransactionForTable = {
      ...mockTransactions[0],
      is_chomesh: true,
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[chomeshTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cardContent = markup.split("Salary")[1]?.split("500 ILS")[0] || "";
    expect(cardContent).not.toContain("Chomesh");
  });

  it("does not show chomesh indicator on card when is_chomesh is false", () => {
    mockUseDonationStore.mockReturnValue(true);
    
    const nonChomeshTransaction: TransactionForTable = {
      ...mockTransactions[0],
      is_chomesh: false,
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[nonChomeshTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cardContent = markup.split("Salary")[1]?.split("500 ILS")[0] || "";
    expect(cardContent).not.toContain("Chomesh");
  });

  it("pressing Enter on focused card opens drawer with transaction details", async () => {
    render(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    expect(card).toBeTruthy();

    card?.focus();
    fireEvent.keyDown(card!, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });
  });

  it("pressing Space on focused card opens drawer with transaction details", async () => {
    render(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    expect(card).toBeTruthy();

    card?.focus();
    fireEvent.keyDown(card!, { key: " ", code: "Space" });

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });
  });

  it("drawer hides detail rows whose value is empty without showing hyphen", async () => {
    const transactionWithEmptyFields: TransactionForTable = {
      ...mockTransactions[0],
      recipient: null,
      payment_method: null,
      category: null,
    };

    render(
      <TransactionCardList
        transactions={[transactionWithEmptyFields]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    expect(screen.queryByText("Recipient")).not.toBeInTheDocument();
    expect(screen.queryByText("Payment Method")).not.toBeInTheDocument();
    expect(screen.queryByText("Category")).not.toBeInTheDocument();
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("drawer shows chomesh row when trackChomeshSeparately is true and is_chomesh is true", async () => {
    mockUseDonationStore.mockReturnValue(true);

    const chomeshTransaction: TransactionForTable = {
      ...mockTransactions[0],
      is_chomesh: true,
    };

    render(
      <TransactionCardList
        transactions={[chomeshTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    const chomeshElements = screen.getAllByText("Chomesh");
    expect(chomeshElements.length).toBeGreaterThan(0);
  });

  it("drawer hides chomesh row when trackChomeshSeparately is false", async () => {
    mockUseDonationStore.mockReturnValue(false);

    render(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    expect(screen.queryByText("Chomesh")).not.toBeInTheDocument();
  });

  it("shows View receipt button only when showReceiptAction returns true", async () => {
    const transactionWithReceipt: TransactionForTable = {
      ...mockTransactions[0],
      receipt_expires_at: "2026-12-01T00:00:00Z",
    };

    render(
      <TransactionCardList
        transactions={[transactionWithReceipt]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    expect(screen.getByText(/View Receipt/)).toBeInTheDocument();
  });

  it("hides View receipt button when showReceiptAction returns false", async () => {
    const transactionWithoutReceipt: TransactionForTable = {
      ...mockTransactions[0],
      receipt_expires_at: null,
    };

    render(
      <TransactionCardList
        transactions={[transactionWithoutReceipt]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    expect(screen.queryByText("View Receipt")).not.toBeInTheDocument();
  });

  it("shows Undo AI button only for ai/ai_auto origin with onUndoAi passed and calls handler when clicked", async () => {
    const aiTransaction: TransactionForTable = {
      ...mockTransactions[0],
      origin: "ai",
    };

    const onUndoAiMock = vi.fn();

    render(
      <TransactionCardList
        transactions={[aiTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        onUndoAi={onUndoAiMock}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Undo AI")).toBeInTheDocument();
    });

    const undoButton = screen.getByText("Undo AI");
    fireEvent.click(undoButton);

    expect(onUndoAiMock).toHaveBeenCalledWith(aiTransaction);
  });

  it("shows Undo AI button for ai_auto origin with onUndoAi passed", async () => {
    const aiAutoTransaction: TransactionForTable = {
      ...mockTransactions[0],
      origin: "ai_auto",
    };

    const onUndoAiMock = vi.fn();

    render(
      <TransactionCardList
        transactions={[aiAutoTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        onUndoAi={onUndoAiMock}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Undo AI")).toBeInTheDocument();
    });
  });

  it("hides Undo AI button when onUndoAi is not passed", async () => {
    const aiTransaction: TransactionForTable = {
      ...mockTransactions[0],
      origin: "ai",
    };

    render(
      <TransactionCardList
        transactions={[aiTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    expect(screen.queryByText("Undo AI")).not.toBeInTheDocument();
  });

  it("hides Undo AI button for non-ai origin even with onUndoAi passed", async () => {
    const regularTransaction: TransactionForTable = {
      ...mockTransactions[0],
      origin: null,
    };

    render(
      <TransactionCardList
        transactions={[regularTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        onUndoAi={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    expect(screen.queryByText("Undo AI")).not.toBeInTheDocument();
  });

  describe("selection mode and long-press", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it("long-press enters selection mode by toggling the card", async () => {
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>();

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      const cards = screen.getAllByRole("button");
      const card = cards.find((c) => c.textContent?.includes("Salary"));

      act(() => {
        fireEvent.pointerDown(card!, { clientX: 100, clientY: 100 });
      });

      expect(onToggleSelected).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(450);
      });

      expect(onToggleSelected).toHaveBeenCalledWith("1");
    });

    it("movement beyond threshold cancels long-press", async () => {
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>();

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      const cards = screen.getAllByRole("button");
      const card = cards.find((c) => c.textContent?.includes("Salary"));

      act(() => {
        fireEvent.pointerDown(card!, { clientX: 100, clientY: 100 });
      });

      act(() => {
        fireEvent.pointerMove(card!, { clientX: 120, clientY: 100 });
      });

      act(() => {
        vi.advanceTimersByTime(450);
      });

      expect(onToggleSelected).not.toHaveBeenCalled();
    });

    it("tap does not toggle selection when not in selection mode", () => {
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>();

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
        />
      );

      const cards = screen.getAllByRole("button");
      const card = cards.find((c) => c.textContent?.includes("Salary"));

      fireEvent.click(card!);

      expect(onToggleSelected).not.toHaveBeenCalled();
    });

    it("tap toggles selection when in selection mode", async () => {
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>(["2"]);

      render(
        <TransactionCardList
          transactions={[mockTransactions[0], mockTransactions[1]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      const cards = screen.getAllByRole("button");
      const card = cards.find((c) => c.textContent?.includes("Salary"));

      fireEvent.click(card!);

      expect(onToggleSelected).toHaveBeenCalledWith("1");
      expect(screen.queryByText("Transaction details and actions")).not.toBeInTheDocument();
    });

    it("selected card shows aria-selected and aria-pressed attributes", () => {
      const selectedIds = new Set<string>(["1"]);

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={vi.fn()}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      const cards = screen.getAllByRole("button");
      const card = cards.find((c) => c.textContent?.includes("Salary"));

      expect(card).toHaveAttribute("aria-selected", "true");
      expect(card).toHaveAttribute("aria-pressed", "true");
    });

    it("selected card shows visual selection state", () => {
      const selectedIds = new Set<string>(["1"]);

      const markup = renderToStaticMarkup(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={vi.fn()}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      expect(markup).toContain("ring-2 ring-primary ring-offset-2");
    });

    it("shows BulkActionsToolbar when items are selected", () => {
      const selectedIds = new Set<string>(["1"]);

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={vi.fn()}
          onClearSelection={vi.fn()}
          selectedCountLabel="1 selected"
          editLabel="Edit"
          deleteLabel="Delete"
          clearLabel="Clear"
          bulkToolbarAriaLabel="Bulk actions"
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      expect(screen.getByText("1 selected")).toBeInTheDocument();
      expect(screen.getByRole("region", { name: "Bulk actions" })).toBeInTheDocument();
      expect(screen.getAllByText("Edit").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Delete").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("hides BulkActionsToolbar when no items are selected", () => {
      const selectedIds = new Set<string>();

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={vi.fn()}
          onClearSelection={vi.fn()}
          selectedCountLabel="0 selected"
          editLabel="Edit"
          deleteLabel="Delete"
          clearLabel="Clear"
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      expect(screen.queryByText("0 selected")).not.toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Bulk actions" })).not.toBeInTheDocument();
      expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    });

    it("long-press does not open drawer after successful trigger", async () => {
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>();

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      const cards = screen.getAllByRole("button");
      const card = cards.find((c) => c.textContent?.includes("Salary"));

      act(() => {
        fireEvent.pointerDown(card!, { clientX: 100, clientY: 100 });
      });

      act(() => {
        vi.advanceTimersByTime(450);
      });

      act(() => {
        fireEvent.pointerUp(card!);
      });

      fireEvent.click(card!);

      expect(onToggleSelected).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("Transaction details and actions")).not.toBeInTheDocument();
    });

    it("renders exactly one BulkActionsToolbar in selection mode", () => {
      const selectedIds = new Set<string>(["1"]);

      const { container } = render(
        <TransactionCardList
          transactions={[mockTransactions[0], mockTransactions[1]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={vi.fn()}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
          selectedCountLabel="1 transaction selected"
          editLabel="Edit"
          deleteLabel="Delete"
          clearLabel="Clear selection"
          bulkToolbarAriaLabel="Bulk actions"
        />
      );

      const toolbars = container.querySelectorAll('[aria-label="Bulk actions"]');
      expect(toolbars).toHaveLength(1);
    });

    it("tap immediately after long-press targets the correct card (no layout shift)", async () => {
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>(["1"]); // Card 1 is already selected

      render(
        <TransactionCardList
          transactions={[mockTransactions[0], mockTransactions[1]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
          selectedCountLabel="1 transaction selected"
          editLabel="Edit"
          deleteLabel="Delete"
          clearLabel="Clear selection"
          bulkToolbarAriaLabel="Bulk actions"
        />
      );

      const cards = screen.getAllByRole("button");
      const firstCard = cards.find((c) => c.textContent?.includes("Salary"));

      // In selection mode, clicking should toggle the same card immediately
      // This verifies that the fixed toolbar doesn't cause layout shift
      fireEvent.click(firstCard!);

      // Should toggle card 1 (the Salary card)
      expect(onToggleSelected).toHaveBeenCalledWith("1");
      expect(onToggleSelected).toHaveBeenCalledTimes(1);
    });

    it("realistic 700ms hold then tap another card selects it", async () => {
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>(["1"]); // Card 1 already selected

      render(
        <TransactionCardList
          transactions={[mockTransactions[0], mockTransactions[1]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
          selectedCountLabel="1 transaction selected"
          editLabel="Edit"
          deleteLabel="Delete"
          clearLabel="Clear selection"
          bulkToolbarAriaLabel="Bulk actions"
        />
      );

      const cards = screen.getAllByRole("button");
      const firstCard = cards.find((c) => c.textContent?.includes("Salary"));
      const secondCard = cards.find((c) => c.textContent?.includes("Groceries"));

      // Realistic long-press: hold for 700ms
      act(() => {
        fireEvent.pointerDown(firstCard!, { clientX: 100, clientY: 100 });
      });

      act(() => {
        vi.advanceTimersByTime(700);
      });

      // Long-press fired at 450ms
      expect(onToggleSelected).toHaveBeenCalledWith("1");
      expect(onToggleSelected).toHaveBeenCalledTimes(1);

      act(() => {
        fireEvent.pointerUp(firstCard!);
      });

      // The trailing click should be swallowed
      fireEvent.click(firstCard!);
      expect(onToggleSelected).toHaveBeenCalledTimes(1); // Still 1, not 2

      // Next tap on a different card should work (new gesture)
      fireEvent.pointerDown(secondCard!, { clientX: 200, clientY: 100 });
      fireEvent.pointerUp(secondCard!);
      fireEvent.click(secondCard!);

      // Should select card 2
      expect(onToggleSelected).toHaveBeenCalledWith("2");
      expect(onToggleSelected).toHaveBeenCalledTimes(2);
    });

    it("700ms hold swallows trailing click, keeps card selected", async () => {
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>();

      const { rerender } = render(
        <TransactionCardList
          transactions={[mockTransactions[0], mockTransactions[1]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
          selectedCountLabel="0 transactions selected"
          editLabel="Edit"
          deleteLabel="Delete"
          clearLabel="Clear selection"
          bulkToolbarAriaLabel="Bulk actions"
        />
      );

      const cards = screen.getAllByRole("button");
      const firstCard = cards.find((c) => c.textContent?.includes("Salary"));

      // Hold for 700ms
      act(() => {
        fireEvent.pointerDown(firstCard!, { clientX: 100, clientY: 100 });
      });

      act(() => {
        vi.advanceTimersByTime(700);
      });

      // Selected at 450ms
      expect(onToggleSelected).toHaveBeenCalledWith("1");
      expect(onToggleSelected).toHaveBeenCalledTimes(1);

      act(() => {
        fireEvent.pointerUp(firstCard!);
      });

      // Trailing click should be swallowed
      fireEvent.click(firstCard!);
      expect(onToggleSelected).toHaveBeenCalledTimes(1); // Still only 1 call

      // Simulate parent updating selectedIds after the first toggle
      const updatedSelectedIds = new Set<string>(["1"]);
      rerender(
        <TransactionCardList
          transactions={[mockTransactions[0], mockTransactions[1]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={updatedSelectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
          selectedCountLabel="1 transaction selected"
          editLabel="Edit"
          deleteLabel="Delete"
          clearLabel="Clear selection"
          bulkToolbarAriaLabel="Bulk actions"
        />
      );

      // Now in selection mode, a normal tap should toggle
      fireEvent.pointerDown(firstCard!, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(firstCard!);
      fireEvent.click(firstCard!);

      // Should deselect (second toggle)
      expect(onToggleSelected).toHaveBeenCalledWith("1");
      expect(onToggleSelected).toHaveBeenCalledTimes(2);
    });

    it("re-rendering with different number of transactions does not cause hook errors", () => {
      const onToggleSelected = vi.fn();
      
      // First render with 2 transactions
      const { rerender } = render(
        <TransactionCardList
          transactions={mockTransactions.slice(0, 2)}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={new Set()}
          onToggleSelected={onToggleSelected}
          selectionDisabled={false}
        />
      );

      // Verify 2 cards rendered
      const cards1 = screen.getAllByRole("button").filter((el) => 
        el.className.includes("cursor-pointer")
      );
      expect(cards1).toHaveLength(2);

      // Re-render with 3 transactions
      rerender(
        <TransactionCardList
          transactions={mockTransactions.slice(0, 3)}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={new Set()}
          onToggleSelected={onToggleSelected}
          selectionDisabled={false}
        />
      );

      // Verify 3 cards rendered without errors
      const cards2 = screen.getAllByRole("button").filter((el) => 
        el.className.includes("cursor-pointer")
      );
      expect(cards2).toHaveLength(3);

      // Re-render back to 2 transactions
      rerender(
        <TransactionCardList
          transactions={mockTransactions.slice(0, 2)}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={new Set()}
          onToggleSelected={onToggleSelected}
          selectionDisabled={false}
        />
      );

      // Verify 2 cards rendered without errors
      const cards3 = screen.getAllByRole("button").filter((el) => 
        el.className.includes("cursor-pointer")
      );
      expect(cards3).toHaveLength(2);
    });
  });

  it("drawer hides chomesh row when is_chomesh is false even with tracking enabled", async () => {
    mockUseDonationStore.mockReturnValue(true);

    const nonChomeshTransaction: TransactionForTable = {
      ...mockTransactions[0],
      is_chomesh: false,
    };

    render(
      <TransactionCardList
        transactions={[nonChomeshTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    expect(screen.queryByText("Chomesh")).not.toBeInTheDocument();
  });

  it("masks card date with PostHog masking attributes", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    // Find the card date section
    const dateSection = markup.match(/2026-11-01[^<]*</);
    expect(dateSection).toBeTruthy();
    
    // Verify that the date is wrapped in a span with ph-mask classes and data-ph-mask attribute
    const dateMaskPattern = /<span[^>]*ph-mask[^>]*data-ph-mask=""[^>]*>2026-11-01<\/span>/;
    expect(markup).toMatch(dateMaskPattern);
  });

  it("masks month separator label with PostHog masking attributes", () => {
    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    // Verify month separator has masking
    const separatorMaskPattern = /<span[^>]*ph-mask[^>]*data-ph-mask=""[^>]*>2026-11<\/span>/;
    expect(markup).toMatch(separatorMaskPattern);
  });

  it("masks drawer date row with PostHog masking attributes", async () => {
    render(
      <TransactionCardList
        transactions={[mockTransactions[0]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    // Check that the date label is present
    expect(screen.getByText("Date")).toBeInTheDocument();
    
    // There are two date elements: one in the card, one in the drawer
    const dateElements = screen.getAllByText("2026-11-01");
    expect(dateElements.length).toBeGreaterThanOrEqual(2);
    
    // Check that both have data-ph-mask attribute
    dateElements.forEach((dateElement) => {
      expect(dateElement).toHaveAttribute("data-ph-mask", "");
      expect(dateElement.className).toContain("ph-mask");
    });
  });

  it("masks chomesh info in drawer when visible", async () => {
    mockUseDonationStore.mockReturnValue(true);

    const chomeshTransaction: TransactionForTable = {
      ...mockTransactions[0],
      is_chomesh: true,
    };

    render(
      <TransactionCardList
        transactions={[chomeshTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Salary"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    const yesElement = screen.getByText("Yes");
    expect(yesElement).toHaveAttribute("data-ph-mask", "");
    expect(yesElement.className).toContain("ph-mask");
  });

  it("masks recurring info in drawer when visible", async () => {
    render(
      <TransactionCardList
        transactions={[mockTransactions[2]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    const cards = screen.getAllByRole("button");
    const card = cards.find((c) => c.textContent?.includes("Charity"));
    fireEvent.click(card!);

    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    // The recurring badge wrapper should have masking
    const recurringBadge = screen.getByText("Recurring Badge");
    const parent = recurringBadge.parentElement;
    expect(parent?.tagName).toBe("SPAN");
    expect(parent).toHaveAttribute("data-ph-mask", "");
    expect(parent?.className).toContain("ph-mask");
    const editRow = recurringBadge.closest("button");
    expect(editRow?.querySelector("div")).toBeNull();
  });
});

function expectPostHogMask(element: Element | null | undefined) {
  expect(element).toBeTruthy();
  expect(element).toHaveAttribute("data-ph-mask", "");
  expect(element?.classList.contains("ph-mask")).toBe(true);
  expect(element?.classList.contains("ph-sensitive")).toBe(true);
}

describe("TransactionCardList PostHog masking", () => {
  const renderList = (transactions: TransactionForTable[], trackChomesh = false) => {
    mockUseDonationStore.mockReturnValue(trackChomesh);
    return render(
      <TransactionCardList
        transactions={transactions}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );
  };

  const openCard = async (label: string) => {
    const cards = screen.getAllByRole("button");
    const card = cards.find((item) => item.textContent?.includes(label));
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });
  };

  beforeEach(() => {
    displayDateSecondary.current = null;
    mockUseDonationStore.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("applies ph-mask and data-ph-mask to the card description", () => {
    renderList([mockTransactions[1]]);

    const description = screen.getByText("Groceries");
    expectPostHogMask(description.closest("[data-ph-mask]"));
    expect(description.textContent).toBe("Groceries");
  });

  it("applies ph-mask and data-ph-mask to the card date", () => {
    renderList([mockTransactions[1]]);

    const date = screen.getByText("2026-11-05");
    expectPostHogMask(date.closest("[data-ph-mask]"));
  });

  it("applies ph-mask and data-ph-mask to the card amount", () => {
    renderList([mockTransactions[1]]);

    const amount = screen.getByText("200 ILS");
    expectPostHogMask(amount.closest("[data-ph-mask]"));
  });

  it("applies ph-mask and data-ph-mask to the card category", () => {
    renderList([mockTransactions[1]]);

    const category = screen.getByText("Food");
    expectPostHogMask(category.closest("[data-ph-mask]"));
  });

  it("applies ph-mask and data-ph-mask to the card chomesh status, icon, and text", () => {
    const { container } = renderList(
      [{ ...mockTransactions[1], is_chomesh: true }],
      true,
    );

    const labels = screen.getAllByText("Chomesh");
    expect(labels.length).toBeGreaterThanOrEqual(1);
    labels.forEach((label) => {
      expectPostHogMask(label.closest("[data-ph-mask]"));
    });

    const icon = container.querySelector(".lucide-badge-check");
    expect(icon).toBeTruthy();
    expectPostHogMask(icon?.closest("[data-ph-mask]"));
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies ph-mask and data-ph-mask to the card recurring indicator", () => {
    renderList([mockTransactions[2]]);

    const card = screen.getByRole("button", { name: /Charity/ });
    const icon = card.querySelector(".lucide-calendar-clock");
    expect(icon).toBeTruthy();
    expectPostHogMask(icon?.closest("[data-ph-mask]"));
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies ph-mask and data-ph-mask to the drawer description and amount", async () => {
    renderList([mockTransactions[1]]);
    await openCard("Groceries");

    const descriptions = screen.getAllByText("Groceries");
    expect(descriptions.length).toBeGreaterThanOrEqual(2);
    descriptions.forEach((description) => {
      expectPostHogMask(description.closest("[data-ph-mask]"));
    });

    const amounts = screen.getAllByText("200 ILS");
    expect(amounts.length).toBeGreaterThanOrEqual(2);
    amounts.forEach((amount) => {
      expectPostHogMask(amount.closest("[data-ph-mask]"));
    });
  });

  it("applies ph-mask and data-ph-mask to the drawer date", async () => {
    renderList([mockTransactions[1]]);
    await openCard("Groceries");

    const dates = screen.getAllByText("2026-11-05");
    expect(dates.length).toBeGreaterThanOrEqual(2);
    dates.forEach((date) => {
      expectPostHogMask(date.closest("[data-ph-mask]"));
    });
  });

  it("applies ph-mask and data-ph-mask to the drawer category and recipient", async () => {
    renderList([mockTransactions[1]]);
    await openCard("Groceries");

    screen.getAllByText("Food").forEach((category) => {
      expectPostHogMask(category.closest("[data-ph-mask]"));
    });
    expectPostHogMask(screen.getByText("SuperMarket").closest("[data-ph-mask]"));
  });

  it("applies ph-mask and data-ph-mask to the drawer payment method", async () => {
    renderList([mockTransactions[1]]);
    await openCard("Groceries");

    const paymentMethod = screen.getByText("Credit Card");
    expectPostHogMask(paymentMethod);
    expect(paymentMethod.closest("[data-ph-mask]")?.classList.contains("ph-mask")).toBe(true);
  });

  it("applies ph-mask and data-ph-mask to drawer chomesh label and value", async () => {
    renderList([{ ...mockTransactions[1], is_chomesh: true }], true);
    await openCard("Groceries");

    const labels = screen.getAllByText("Chomesh");
    expect(labels.length).toBeGreaterThanOrEqual(2);
    labels.forEach((label) => {
      expectPostHogMask(label);
    });

    const value = screen.getByText("Yes");
    expectPostHogMask(value);
  });

  it("applies ph-mask and data-ph-mask to drawer recurring info", async () => {
    renderList([mockTransactions[2]], true);
    await openCard("Charity");

    const recurringBadge = screen.getByText("Recurring Badge");
    expectPostHogMask(recurringBadge.closest("[data-ph-mask]"));
  });

  it("uses distinct recurring and conversion icons on a converted recurring card", async () => {
    renderList([convertedRecurringTransaction]);

    const card = screen.getByRole("button", { name: /Charity/ });
    const recurringIcon = card.querySelector(".lucide-calendar-clock");
    const conversionIcon = card.querySelector(".lucide-coins");
    expect(recurringIcon).toBeTruthy();
    expect(conversionIcon).toBeTruthy();
    expect(conversionIcon?.getAttribute("class")).toContain("h-4");
    expect(conversionIcon?.getAttribute("class")).toContain("w-4");
    expect(conversionIcon?.getAttribute("class")).toContain("text-muted-foreground");
    expect(recurringIcon).not.toBe(conversionIcon);
    expect(card.querySelector(".lucide-repeat")).toBeNull();
    expect(card.querySelector(".lucide-refresh-cw")).toBeNull();

    await openCard("Charity");
    const drawer = screen.getByRole("dialog");
    expect(drawer.querySelector(".lucide-calendar-clock")).toBeNull();
    expect(drawer.querySelector(".lucide-coins")).toBeNull();
    expect(drawer.querySelector(".lucide-repeat")).toBeNull();
    expect(drawer.querySelector(".lucide-refresh-cw")).toBeTruthy();
  });

  it("shows the masked original amount under a converted card and omits it otherwise", () => {
    renderList([convertedRecurringTransaction, mockTransactions[1]]);

    const convertedCard = screen.getByRole("button", { name: /Charity/ });
    const originalAmount = within(convertedCard).getByText(originalUsd);
    expectPostHogMask(originalAmount);
    expect(originalAmount.className).toContain("text-xs");
    expect(originalAmount.className).toContain("text-muted-foreground");

    const plainCard = screen.getByRole("button", { name: /Groceries/ });
    expect(within(plainCard).queryByText(originalUsd)).not.toBeInTheDocument();
    expect(plainCard.querySelector(".lucide-coins")).toBeNull();
  });

  it("renders one masked conversion pill for a converted transaction and hides it otherwise", async () => {
    renderList([convertedRecurringTransaction]);
    await openCard("Charity");

    const drawer = screen.getByRole("dialog");
    const detail = `${originalUsd} × 3.70`;
    const pillDetail = within(drawer).getByText(detail);
    expect(pillDetail.tagName).toBe("BDI");
    expect(pillDetail).toHaveAttribute("dir", "ltr");
    expectPostHogMask(pillDetail);
    expect(pillDetail.closest("div")?.textContent).toContain("Converted · ");
    expect(drawer.querySelector(".lucide-refresh-cw")).toBeTruthy();
    expect(screen.queryByText("Original Amount")).not.toBeInTheDocument();
    expect(screen.queryByText("Exchange Rate")).not.toBeInTheDocument();
    expect(screen.queryByText("Converted Amount")).not.toBeInTheDocument();
    expect(screen.queryByText("Type")).not.toBeInTheDocument();

    cleanup();
    renderList([mockTransactions[1]]);
    await openCard("Groceries");

    expect(screen.queryByText("Converted · ", { exact: false })).not.toBeInTheDocument();
    expect(screen.queryByText(originalUsd)).not.toBeInTheDocument();
    expect(screen.getByRole("dialog").querySelector(".lucide-refresh-cw")).toBeNull();
  });

  describe("swipe actions", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      reducedMotion.current = false;
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query.includes("max-width: 767px") && query.includes("pointer: coarse"),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }));
    });

    afterEach(() => {
      i18nDir.current = "ltr";
      reducedMotion.current = false;
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it("does not swipe or edit while selection mode is active", () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onToggleSelected = vi.fn();
      const selectedIds = new Set<string>(["1"]);

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={onEdit}
          onDelete={onDelete}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          selectedIds={selectedIds}
          onToggleSelected={onToggleSelected}
          onClearSelection={vi.fn()}
          onSelectionEdit={vi.fn()}
          onSelectionDelete={vi.fn()}
        />
      );

      const cards = screen.getAllByRole("button");
      const card = cards.find((c) => c.textContent?.includes("Salary"));

      act(() => {
        fireEvent.pointerDown(card!, { clientX: 180, clientY: 100, pointerType: "touch" });
        fireEvent.pointerMove(card!, { clientX: 20, clientY: 100, pointerType: "touch" });
        fireEvent.pointerUp(card!, { clientX: 20, clientY: 100, pointerType: "touch" });
      });

      expect(onEdit).not.toHaveBeenCalled();
      expect(onDelete).not.toHaveBeenCalled();
      expect(onToggleSelected).not.toHaveBeenCalled();
      expect((card as HTMLElement).style.marginInlineEnd).toBe("");
      expect((card as HTMLElement).style.transform).toBe("");
    });

    it("a horizontal swipe does not fire the long-press selection", () => {
      const onToggleSelected = vi.fn();

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
          onToggleSelected={onToggleSelected}
        />
      );

      const cards = screen.getAllByRole("button");
      const card = cards.find((c) => c.textContent?.includes("Salary"));

      act(() => {
        fireEvent.pointerDown(card!, { clientX: 100, clientY: 100, pointerType: "touch" });
        fireEvent.pointerMove(card!, { clientX: 160, clientY: 102, pointerType: "touch" });
        vi.advanceTimersByTime(800);
        fireEvent.pointerUp(card!, { clientX: 160, clientY: 102, pointerType: "touch" });
      });

      expect(onToggleSelected).not.toHaveBeenCalled();
    });

    it("action buttons are full-height and anchored at the inline end", () => {
      const markup = renderToStaticMarkup(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      expect(markup).toContain('aria-label="Edit"');
      expect(markup).toContain('aria-label="Delete"');
      expect(markup).toContain("h-full");
      expect(markup).toContain("w-14");
      expect(markup).toContain("min-w-[44px]");
      expect(markup).toContain("rounded-lg");
      expect(markup).toContain("end-0");
      expect(markup).toContain("ps-2");
      expect(markup).toContain("min-w-0");
      expect(markup).toContain("max-md:[@media(pointer:coarse)]:touch-pan-y");
      expect(markup).toContain("max-md:[@media(pointer:coarse)]:z-0");
      expect(markup).toContain("relative z-10");
      expect(markup).toContain('tabindex="-1"');
      expect(markup).not.toContain("z-[1]");
      expect(markup).not.toContain("z-[2]");
      expect(markup).not.toContain("marginInlineEnd");
      expect(markup).not.toContain("disabled=");

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );
      const edit = screen.getByRole("button", { name: "Edit", hidden: true });
      const actions = edit.parentElement as HTMLElement;
      const row = actions.parentElement as HTMLElement;
      expect(actions).toHaveAttribute("aria-hidden", "true");
      expect(actions.classList.contains("pointer-events-none")).toBe(true);
      expect(actions.classList.contains("max-md:[@media(pointer:coarse)]:invisible")).toBe(true);
      expect(row).toHaveAttribute("data-swipe-row", mockTransactions[0].id);
      expect(row.classList.contains("max-md:[@media(pointer:coarse)]:isolate")).toBe(true);
    });

    function cardTitled(title: string): HTMLElement {
      const card = screen.getAllByRole("button").find((el) => el.textContent?.includes(title));
      if (!card) {
        throw new Error(`missing card ${title}`);
      }
      return card;
    }

    function swipeCard(card: HTMLElement, direction: "open" | "close") {
      const openMovesLeft = i18nDir.current !== "rtl";
      const moveLeft = direction === "open" ? openMovesLeft : !openMovesLeft;
      const startX = 160;
      const endX = moveLeft ? 20 : 300;
      act(() => {
        fireEvent.pointerDown(card, { clientX: startX, clientY: 40, pointerType: "touch" });
        fireEvent.pointerMove(card, { clientX: endX, clientY: 40, pointerType: "touch" });
        fireEvent.pointerUp(card, { clientX: endX, clientY: 40, pointerType: "touch" });
      });
    }

    function swipeCardOpen(card: HTMLElement) {
      swipeCard(card, "open");
    }

    function contentLayer(card: HTMLElement): HTMLElement {
      const parent = card.parentElement;
      if (parent && !parent.hasAttribute("data-swipe-row")) {
        return parent;
      }
      return card;
    }

    function readTranslateX(card: HTMLElement): number {
      const transform = contentLayer(card).style.transform;
      if (!transform || transform === "none") return 0;
      const match = /translate(?:3d|X)\(\s*([-\d.]+)px/.exec(transform);
      if (!match) {
        throw new Error(`unexpected transform: ${transform}`);
      }
      return Number(match[1]);
    }

    function settleSwipe() {
      act(() => {
        vi.advanceTimersByTime(220);
      });
    }

    function expectClosed(card: HTMLElement) {
      settleSwipe();
      expect(card.style.marginInlineEnd).toBe("");
      expect(readTranslateX(card)).toBe(0);
    }

    function expectOpen(card: HTMLElement) {
      settleSwipe();
      expect(card.style.marginInlineEnd).toBe("");
      const expected = i18nDir.current === "rtl" ? 128 : -128;
      expect(readTranslateX(card)).toBe(expected);
    }

    function tapCard(card: HTMLElement) {
      act(() => {
        fireEvent.pointerDown(card, { clientX: 40, clientY: 40, pointerType: "touch" });
        fireEvent.pointerUp(card, { clientX: 40, clientY: 40, pointerType: "touch" });
        fireEvent.click(card);
      });
    }

    it("outside tap closes an open card and its actions are not clickable", () => {
      const onDelete = vi.fn();

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={onDelete}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCardOpen(card);
      expectOpen(card);

      const topBar = document.createElement("button");
      topBar.setAttribute("aria-label", "Menu");
      document.body.appendChild(topBar);
      fireEvent.click(topBar);

      expectClosed(card);
      topBar.remove();
      const deleteButton = screen.getByRole("button", { name: "Delete", hidden: true });
      expect(deleteButton).toBeEnabled();
      expect(deleteButton).not.toHaveClass("opacity-50");
      expect(deleteButton).toHaveAttribute("tabindex", "-1");
      expect(deleteButton.closest("[aria-hidden='true']")).toBeTruthy();
      fireEvent.click(deleteButton);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it("swiping a second card closes the first", () => {
      render(
        <TransactionCardList
          transactions={[mockTransactions[0], mockTransactions[1]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const first = cardTitled("Salary");
      const second = cardTitled("Groceries");
      swipeCardOpen(first);
      expectOpen(first);

      swipeCardOpen(second);

      expectClosed(first);
      expectOpen(second);
    });

    it("entering selection mode closes an open card and that card can be selected", () => {
      const onToggleSelected = vi.fn();
      const onDelete = vi.fn();
      const listProps = {
        transactions: [mockTransactions[0], mockTransactions[1]],
        onEdit: vi.fn(),
        onDelete,
        onEditRecurring: vi.fn(),
        isFetchingRec: false,
        loading: false,
        onToggleSelected,
        onClearSelection: vi.fn(),
        onSelectionEdit: vi.fn(),
        onSelectionDelete: vi.fn(),
        selectedCountLabel: "1 selected",
        editLabel: "Edit selected",
        deleteLabel: "Delete selected",
        clearLabel: "Clear",
        bulkToolbarAriaLabel: "Bulk actions",
      };

      const { rerender } = render(
        <TransactionCardList {...listProps} selectedIds={new Set()} />
      );

      const salary = cardTitled("Salary");
      swipeCardOpen(salary);
      expectOpen(salary);

      rerender(
        <TransactionCardList {...listProps} selectedIds={new Set(["2"])} />
      );

      expectClosed(salary);
      swipeCard(salary, "open");
      expectClosed(salary);
      const deleteButtons = screen.getAllByRole("button", { name: "Delete", hidden: true });
      deleteButtons.forEach((button) => {
        expect(button).toBeEnabled();
        expect(button).toHaveAttribute("tabindex", "-1");
        expect(button.closest("[aria-hidden='true']")).toBeTruthy();
      });
      fireEvent.click(deleteButtons[0]);
      expect(onDelete).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.click(salary);
      expect(onToggleSelected).toHaveBeenCalledWith("1");
    });

    it("Edit closes the open card", () => {
      const onEdit = vi.fn();

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={onEdit}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCardOpen(card);
      expectOpen(card);

      const actions = card.closest("[data-swipe-row]")?.firstElementChild;
      expect(actions?.className).toContain("z-0");
      expect(actions?.className).not.toContain("z-[2]");
      expect(contentLayer(card).className).toContain("z-10");
      expect(actions?.className).not.toContain("pointer-events-none");
      const editButton = screen.getByRole("button", { name: "Edit" });
      expect(editButton).toBeEnabled();
      expect(editButton).not.toHaveClass("opacity-50");
      editButton.focus();
      fireEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(mockTransactions[0]);
      expect(document.activeElement).toBe(card);
      expectClosed(card);
    });

    it("opens on a finger-left swipe in LTR, ignores finger-right, and closes on finger-right", () => {
      i18nDir.current = "ltr";
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCard(card, "close");
      expectClosed(card);

      swipeCard(card, "open");
      expectOpen(card);
      expect(contentLayer(card).className).toContain("transition-transform");
      expect(contentLayer(card).style.transition).toBe("");
      expect(card.closest("[data-swipe-row]")?.firstElementChild?.className).toContain("end-0");

      swipeCard(card, "close");
      expectClosed(card);
    });

    it("opens on a finger-right swipe in RTL, ignores finger-left, and closes on finger-left", () => {
      i18nDir.current = "rtl";
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCard(card, "close");
      expectClosed(card);

      swipeCard(card, "open");
      expectOpen(card);
      expect(card.closest("[data-swipe-row]")?.firstElementChild?.className).toContain("end-0");

      swipeCard(card, "close");
      expectClosed(card);
    });

    it("does not open when the viewport is wider than the phone query", () => {
      vi.stubGlobal("matchMedia", () => ({
        matches: false,
        media: "",
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
        onchange: null,
      }));

      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCard(card, "open");
      expect(card.style.marginInlineEnd).toBe("");
      expect(card.style.transform).toBe("");
      expect(card.parentElement?.hasAttribute("data-swipe-row")).toBe(true);
    });

    it("keeps Edit and Delete opaque and enabled while the row is opening and when it is open", () => {
      const onDelete = vi.fn();
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={onDelete}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      act(() => {
        fireEvent.pointerDown(card, { clientX: 160, clientY: 40, pointerType: "touch" });
        fireEvent.pointerMove(card, { clientX: 90, clientY: 40, pointerType: "touch" });
      });

      const actions = card.closest("[data-swipe-row]")?.firstElementChild as HTMLElement;
      expect(actions.className).toContain("z-0");
      expect(contentLayer(card).className).toContain("z-10");
      expect(actions.classList.contains("pointer-events-none")).toBe(false);
      expect(actions.classList.contains("max-md:[@media(pointer:coarse)]:invisible")).toBe(false);
      expect(actions.getAttribute("aria-hidden")).not.toBe("true");
      expect(readTranslateX(card)).toBe(-70);
      const openingEdit = screen.getByRole("button", { name: "Edit" });
      const openingDelete = screen.getByRole("button", { name: "Delete" });
      expect(openingEdit).toBeEnabled();
      expect(openingDelete).toBeEnabled();
      expect(openingEdit).not.toHaveClass("opacity-50");
      expect(openingDelete).not.toHaveClass("opacity-50");
      expect(openingEdit.className).toContain("rounded-lg");

      act(() => {
        fireEvent.pointerUp(card, { clientX: 90, clientY: 40, pointerType: "touch" });
      });
      expect(contentLayer(card).style.transition).toBe("transform 200ms ease-out");
      expectOpen(card);
      expect(contentLayer(card).style.transition).toBe("");
      expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();

      const deleteButton = screen.getByRole("button", { name: "Delete" });
      deleteButton.focus();
      fireEvent.click(deleteButton);
      expect(onDelete).toHaveBeenCalledWith(mockTransactions[0]);
      expect(document.activeElement).toBe(card);
      expectClosed(card);
    });

    it("closes an open card when the page scrolls", () => {
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCardOpen(card);
      expectOpen(card);

      act(() => {
        window.dispatchEvent(new Event("scroll"));
      });

      expectClosed(card);
    });

    it("closes an open card when another card is tapped", () => {
      render(
        <TransactionCardList
          transactions={[mockTransactions[0], mockTransactions[1]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const first = cardTitled("Salary");
      const second = cardTitled("Groceries");
      swipeCardOpen(first);
      expectOpen(first);

      tapCard(second);

      expectClosed(first);
      expect(readTranslateX(second)).toBe(0);
    });

    it("a tap on a closed card opens the drawer", () => {
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      tapCard(cardTitled("Salary"));
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });

    it("a tap on an open card closes it without opening the drawer", () => {
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCardOpen(card);
      expectOpen(card);
      tapCard(card);
      expectClosed(card);
      expect(screen.queryByText("Transaction details and actions")).not.toBeInTheDocument();
    });

    it("a drag during the release continues from the painted offset", () => {
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      act(() => {
        fireEvent.pointerDown(card, { clientX: 160, clientY: 40, pointerType: "touch" });
        fireEvent.pointerMove(card, { clientX: 90, clientY: 40, pointerType: "touch" });
        fireEvent.pointerUp(card, { clientX: 90, clientY: 40, pointerType: "touch" });
      });
      const layer = contentLayer(card);
      const originalGetComputedStyle = window.getComputedStyle.bind(window);
      const computed = vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
        if (element === layer) {
          return { transform: "matrix(1, 0, 0, 1, -80, 0)" } as CSSStyleDeclaration;
        }
        return originalGetComputedStyle(element);
      });

      act(() => {
        fireEvent.pointerDown(card, { clientX: 100, clientY: 40, pointerType: "touch" });
        fireEvent.pointerMove(card, { clientX: 80, clientY: 40, pointerType: "touch" });
      });

      expect(readTranslateX(card)).toBe(-100);
      computed.mockRestore();
    });

    it("a drag during the release continues from the painted offset in RTL", () => {
      i18nDir.current = "rtl";
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      act(() => {
        fireEvent.pointerDown(card, { clientX: 20, clientY: 40, pointerType: "touch" });
        fireEvent.pointerMove(card, { clientX: 90, clientY: 40, pointerType: "touch" });
        fireEvent.pointerUp(card, { clientX: 90, clientY: 40, pointerType: "touch" });
      });
      const layer = contentLayer(card);
      const originalGetComputedStyle = window.getComputedStyle.bind(window);
      const computed = vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
        if (element === layer) {
          return { transform: "matrix(1, 0, 0, 1, 80, 0)" } as CSSStyleDeclaration;
        }
        return originalGetComputedStyle(element);
      });

      act(() => {
        fireEvent.pointerDown(card, { clientX: 100, clientY: 40, pointerType: "touch" });
        fireEvent.pointerMove(card, { clientX: 120, clientY: 40, pointerType: "touch" });
      });

      expect(readTranslateX(card)).toBe(100);
      computed.mockRestore();
    });

    it("a drag that lands on the release target is not left at the painted offset", () => {
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCardOpen(card);
      expectOpen(card);
      swipeCard(card, "close");

      const layer = contentLayer(card);
      const originalGetComputedStyle = window.getComputedStyle.bind(window);
      const computed = vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
        if (element === layer) {
          return { transform: "matrix(1, 0, 0, 1, -10, 0)" } as CSSStyleDeclaration;
        }
        return originalGetComputedStyle(element);
      });

      act(() => {
        fireEvent.pointerDown(card, { clientX: 100, clientY: 40, pointerType: "touch" });
        fireEvent.pointerMove(card, { clientX: 112, clientY: 40, pointerType: "touch" });
      });

      expect(readTranslateX(card)).toBe(0);
      computed.mockRestore();
    });

    it("closes from the painted offset and hides the strip only after the release settles", () => {
      const hiddenClass = "max-md:[@media(pointer:coarse)]:invisible";
      const closers = [
        () => {
          act(() => {
            window.dispatchEvent(new Event("scroll"));
          });
        },
        (card: HTMLElement) => {
          tapCard(card);
        },
        () => {
          const topBar = document.createElement("button");
          topBar.setAttribute("aria-label", "Menu");
          document.body.appendChild(topBar);
          fireEvent.click(topBar);
          topBar.remove();
        },
      ];

      closers.forEach((close) => {
        cleanup();
        render(
          <TransactionCardList
            transactions={[mockTransactions[0]]}
            onEdit={vi.fn()}
            onDelete={vi.fn()}
            onEditRecurring={vi.fn()}
            isFetchingRec={false}
            loading={false}
          />
        );

        const card = cardTitled("Salary");
        act(() => {
          fireEvent.pointerDown(card, { clientX: 160, clientY: 40, pointerType: "touch" });
          fireEvent.pointerMove(card, { clientX: 90, clientY: 40, pointerType: "touch" });
          fireEvent.pointerUp(card, { clientX: 90, clientY: 40, pointerType: "touch" });
        });

        const layer = contentLayer(card);
        const rewind: string[] = [];
        const rect = vi.spyOn(layer, "getBoundingClientRect").mockImplementation(() => {
          rewind.push(layer.style.transform);
          return new DOMRect();
        });
        const originalGetComputedStyle = window.getComputedStyle.bind(window);
        const computed = vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
          if (element === layer) {
            return { transform: "matrix(1, 0, 0, 1, -40, 0)" } as CSSStyleDeclaration;
          }
          return originalGetComputedStyle(element);
        });

        close(card);

        expect(rewind).toContain("translateX(-40px)");
        expect(rewind).not.toContain("translateX(-128px)");
        expect(readTranslateX(card)).toBe(0);
        const actions = card.closest("[data-swipe-row]")?.firstElementChild as HTMLElement;
        expect(actions).toHaveAttribute("aria-hidden", "true");
        expect(actions.classList.contains(hiddenClass)).toBe(false);

        act(() => {
          vi.advanceTimersByTime(220);
        });
        expect(actions.classList.contains(hiddenClass)).toBe(true);
        rect.mockRestore();
        computed.mockRestore();
      });
    });

    it("jumps the card shut when reduced motion is preferred", () => {
      reducedMotion.current = true;
      render(
        <TransactionCardList
          transactions={[mockTransactions[0]]}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onEditRecurring={vi.fn()}
          isFetchingRec={false}
          loading={false}
        />
      );

      const card = cardTitled("Salary");
      swipeCardOpen(card);
      expect(readTranslateX(card)).toBe(-128);
      expect(contentLayer(card).className).not.toContain("transition-transform");

      const topBar = document.createElement("button");
      topBar.setAttribute("aria-label", "Menu");
      document.body.appendChild(topBar);
      fireEvent.click(topBar);
      topBar.remove();

      expect(card.style.marginInlineEnd).toBe("");
      expect(readTranslateX(card)).toBe(0);
    });
  });
});

const convertedRecurringTransaction: TransactionForTable = {
  ...mockTransactions[2],
  amount: 370,
  currency: "ILS",
  original_amount: 100,
  original_currency: "USD",
  conversion_rate: 3.7,
  conversion_date: "2026-11-10",
  rate_source: "manual",
};

const originalUsd = formatCurrency(100, "USD", "en");

describe("transaction details drawer", () => {
  const openDrawer = async (transaction: TransactionForTable, trackChomesh = false) => {
    mockUseDonationStore.mockReturnValue(trackChomesh);
    render(
      <TransactionCardList
        transactions={[transaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />,
    );
    const card = screen.getAllByRole("button").find((item) =>
      item.textContent?.includes(transaction.description || "this transaction"),
    );
    fireEvent.click(card!);
    await waitFor(() => {
      expect(screen.getByText("Transaction details and actions")).toBeInTheDocument();
    });
    return screen.getByRole("dialog");
  };

  beforeEach(() => {
    displayDateSecondary.current = null;
    mockUseDonationStore.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders conditional rows in desktop column order and omits the type row", async () => {
    const full: TransactionForTable = {
      ...mockTransactions[0],
      recipient: "Employer",
      is_chomesh: true,
      recurring_info: mockTransactions[2].recurring_info,
      source_recurring_id: "rec-full",
    };

    const drawer = await openDrawer(full, true);
    const text = drawer.textContent ?? "";
    const labels = ["Date", "Category", "Recipient", "Payment Method", "Chomesh", "Recurring"];
    let lastIndex = -1;
    for (const label of labels) {
      const index = text.indexOf(label);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
    expect(within(drawer).queryByText("Type")).not.toBeInTheDocument();
    expect(within(drawer).getByText("Income").className).toContain("bg-green-100");
    expect(within(drawer).getByText("Edit link")).toBeInTheDocument();
    expect(within(drawer).queryByText("Edit Recurring")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("-")).not.toBeInTheDocument();
  });

  it("places the title at the start and the type pill at the end", async () => {
    const drawer = await openDrawer(mockTransactions[0]);
    const title = within(drawer).getByRole("heading", { name: "Salary" });
    expect(title.className).toContain("min-w-0");
    expect(title.className).toContain("line-clamp-2");
    expect(title.className).toContain("break-words");
    expect(title.className).not.toContain("truncate");
    expectPostHogMask(title);
    expect(title.parentElement?.className).toContain("justify-between");
    const pill = within(title.parentElement as HTMLElement).getByText("Income");
    expect(pill.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_PRECEDING).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
  });

  it("omits empty, whitespace, and non income or expense rows without leaving a gap marker", async () => {
    const sparse: TransactionForTable = {
      ...mockTransactions[1],
      category: "   ",
      recipient: "  ",
      payment_method: "Credit Card",
      is_chomesh: false,
      description: "Groceries",
    };

    const drawer = await openDrawer(sparse, true);
    expect(within(drawer).getByText("Date")).toBeInTheDocument();
    expect(within(drawer).getByText("Credit Card")).toBeInTheDocument();
    expect(within(drawer).queryByText("Category")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Recipient")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Chomesh")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("Recurring")).not.toBeInTheDocument();
    expect(within(drawer).queryByText("-")).not.toBeInTheDocument();
    expect(drawer.querySelector(".lucide-refresh-cw")).toBeNull();
  });

  it("shows a category row only for income and expense families", async () => {
    const donation = await openDrawer(mockTransactions[2]);
    expect(within(donation).queryByText("Category")).not.toBeInTheDocument();
    cleanup();

    const exempt = await openDrawer({
      ...mockTransactions[0],
      type: "exempt-income",
      category: "Salary",
    });
    expect(within(exempt).getByText("Category")).toBeInTheDocument();
    expect(within(exempt).getAllByText("Salary").length).toBeGreaterThanOrEqual(2);
    cleanup();

    const opening = await openDrawer({
      ...mockTransactions[0],
      type: "initial_balance",
      category: "Salary",
      description: "Opening",
    });
    expect(within(opening).queryByText("Category")).not.toBeInTheDocument();
  });

  it("stacks the secondary date under the primary date and masks both", async () => {
    displayDateSecondary.current = "ט׳ בחשוון תשפ״ז";
    const drawer = await openDrawer(mockTransactions[0]);
    const primary = within(drawer).getByText("2026-11-01");
    const secondary = within(drawer).getByText("ט׳ בחשוון תשפ״ז");
    expect(secondary.className).toContain("block");
    expect(primary.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expectPostHogMask(primary);
    expectPostHogMask(secondary);
  });

  it("makes the recurring row the edit target and hides the link when it cannot be edited", async () => {
    const onEditRecurring = vi.fn();
    mockUseDonationStore.mockReturnValue(false);
    render(
      <TransactionCardList
        transactions={[mockTransactions[2]]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={onEditRecurring}
        isFetchingRec={false}
        loading={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Charity/ }));
    const drawer = await screen.findByRole("dialog");
    fireEvent.click(within(drawer).getByText("Recurring"));
    expect(onEditRecurring).toHaveBeenCalledWith("rec1");
    cleanup();

    const completed: TransactionForTable = {
      ...mockTransactions[2],
      recurring_info: {
        ...mockTransactions[2].recurring_info!,
        status: "completed",
      },
    };
    render(
      <TransactionCardList
        transactions={[completed]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={onEditRecurring}
        isFetchingRec={false}
        loading={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Charity/ }));
    const completedDrawer = await screen.findByRole("dialog");
    expect(within(completedDrawer).queryByText("Edit link")).not.toBeInTheDocument();
    const completedLabel = within(completedDrawer).getByText("Recurring");
    expect(completedLabel.closest("button")).toBeNull();
    const completedBadge = within(completedDrawer).getByText("Recurring Badge");
    expect(completedBadge.parentElement?.tagName).toBe("SPAN");
    expect(completedBadge.parentElement).toHaveAttribute("data-ph-mask", "");

    cleanup();
    const withoutSeries: TransactionForTable = {
      ...mockTransactions[2],
      source_recurring_id: null,
    };
    const plain = await openDrawer(withoutSeries);
    expect(within(plain).getByText("Recurring Badge")).toBeInTheDocument();
    expect(within(plain).queryByText("Edit link")).not.toBeInTheDocument();
  });

  it("wraps a long title onto two lines and keeps the type pill at the inline end", async () => {
    const longTitle = "Annual synagogue membership and building fund contribution for the family";
    const drawer = await openDrawer({
      ...mockTransactions[0],
      description: longTitle,
    });
    const title = within(drawer).getByRole("heading", { name: longTitle });
    expect(title.textContent).toBe(longTitle);
    expect(title.className).toContain("line-clamp-2");
    expect(title.className).toContain("break-words");
    expectPostHogMask(title);
    const pill = within(title.parentElement as HTMLElement).getByText("Income");
    expect(title.parentElement?.className).toContain("justify-between");
    expect(pill.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_PRECEDING).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
    );
  });

  it("shows the conversion pill only when a stored conversion exists", async () => {
    const converted: TransactionForTable = {
      ...mockTransactions[0],
      amount: 77.8,
      currency: "ILS",
      original_amount: 25,
      original_currency: "USD",
      conversion_rate: 3.11,
    };
    const drawer = await openDrawer(converted);
    const detail = `${formatCurrency(25, "USD", "en")} × 3.11`;
    const pill = within(drawer).getByText(detail);
    expect(pill.tagName).toBe("BDI");
    expect(pill).toHaveAttribute("dir", "ltr");
    expect(pill.textContent).toBe("$25 × 3.11");
    expectPostHogMask(pill);
    expect(drawer.textContent).toContain("Converted · ");
    expect(drawer.querySelector(".lucide-refresh-cw")).toBeTruthy();
    cleanup();

    const sameCurrency: TransactionForTable = {
      ...converted,
      original_currency: "ILS",
      original_amount: 77.8,
    };
    const plain = await openDrawer(sameCurrency);
    expect(plain.querySelector(".lucide-refresh-cw")).toBeNull();
    expect(within(plain).queryByText(detail)).not.toBeInTheDocument();
  });
});
