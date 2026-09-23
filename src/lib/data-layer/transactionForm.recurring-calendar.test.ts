import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCalendarAdapter } from "@/lib/calendar";

const { createRecurringTransaction } = vi.hoisted(() => ({
  createRecurringTransaction: vi.fn(),
}));

vi.mock("./recurringTransactions.service", () => ({
  createRecurringTransaction,
}));
vi.mock("./transactions.service", () => ({ addTransaction: vi.fn() }));
vi.mock("./categories.service", () => ({
  clearCategoryCacheForType: vi.fn(),
}));
vi.mock("./paymentMethods.service", () => ({
  clearPaymentMethodCache: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));
vi.mock("@/lib/onboarding/transactionBridge", () => ({
  notifyOnboardingTransactionCreated: vi.fn(),
}));

import { handleTransactionSubmit } from "./transactionForm.service";

describe("recurring transaction calendar payload", () => {
  beforeEach(() => {
    createRecurringTransaction.mockReset();
  });

  it("writes the chosen Hebrew calendar and computes the first due date in it", async () => {
    const startDate = getCalendarAdapter("hebrew").toIsoDate({
      year: 5787,
      month: 5,
      day: 20,
    });

    await handleTransactionSubmit({
      amount: 100,
      currency: "ILS",
      date: startDate,
      description: "",
      type: "expense",
      category: "food",
      is_chomesh: false,
      recipient: "",
      payment_method: "",
      isExempt: false,
      isRecognized: false,
      isFromPersonalFunds: false,
      is_recurring: true,
      frequency: "monthly",
      recurring_calendar_type: "hebrew",
      recurring_day_of_month: 30,
    });

    expect(createRecurringTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        calendar_type: "hebrew",
        anchor_month_code: null,
        start_date: startDate,
        next_due_date: getCalendarAdapter("hebrew").toIsoDate({
          year: 5787,
          month: 5,
          day: 30,
        }),
        day_of_month: 30,
      }),
    );
  });
});
