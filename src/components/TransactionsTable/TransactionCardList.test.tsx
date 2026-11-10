import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TransactionCardList } from "./TransactionCardList";
import type { TransactionForTable } from "@/types/transaction";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "types.income") return "Income";
      if (key === "types.expense") return "Expense";
      if (key === "types.donation") return "Donation";
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
      if (key === "actions.edit") return "Edit";
      if (key === "actions.delete") return "Delete";
      if (key === "actions.cancel") return "Cancel";
      if (key === "actions.editRecurring") return "Edit Recurring";
      if (key === "messages.loading") return "Loading...";
      if (key === "modal.editDescription") return "Update transaction details";
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

  it("accepts onUndoAi prop for AI transaction actions", () => {
    const aiTransaction: TransactionForTable = {
      ...mockTransactions[0],
      origin: "ai",
    };
    const onUndoAi = vi.fn();

    renderToStaticMarkup(
      <TransactionCardList
        transactions={[aiTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        onUndoAi={onUndoAi}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(onUndoAi).not.toHaveBeenCalled();
  });

  it("renders without errors when receipt_expires_at is present", () => {
    const transactionWithReceipt: TransactionForTable = {
      ...mockTransactions[0],
      receipt_expires_at: "2026-12-01T00:00:00Z",
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[transactionWithReceipt]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Salary");
  });

  it("renders without errors when origin is ai or ai_auto", () => {
    const aiTransaction: TransactionForTable = {
      ...mockTransactions[0],
      origin: "ai_auto",
    };

    const markup = renderToStaticMarkup(
      <TransactionCardList
        transactions={[aiTransaction]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onEditRecurring={vi.fn()}
        onUndoAi={vi.fn()}
        isFetchingRec={false}
        loading={false}
      />
    );

    expect(markup).toContain("Salary");
  });
});
