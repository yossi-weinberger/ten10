// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TransactionCardList } from "./TransactionCardList";
import type { TransactionForTable } from "@/types/transaction";

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
      return key;
    },
    i18n: {
      language: "en",
      dir: () => "ltr",
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
    secondary: null,
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
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
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
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
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
    expect(parent).toHaveAttribute("data-ph-mask", "");
    expect(parent?.className).toContain("ph-mask");
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
    const icon = card.querySelector(".lucide-repeat");
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
});
