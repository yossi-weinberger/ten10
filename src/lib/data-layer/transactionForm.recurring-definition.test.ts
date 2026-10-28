import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TransactionFormValues } from "@/lib/schemas";

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

const BASE: TransactionFormValues = {
  amount: 200,
  currency: "ILS",
  date: "2026-10-28",
  description: "Kollel",
  type: "donation",
  category: null,
  is_chomesh: false,
  recipient: "Kollel",
  payment_method: "credit_card",
  isExempt: false,
  isRecognized: false,
  isFromPersonalFunds: false,
  is_recurring: true,
  frequency: "monthly",
};

async function submittedDefinition(values: TransactionFormValues) {
  await handleTransactionSubmit(values);
  expect(createRecurringTransaction).toHaveBeenCalledTimes(1);
  return createRecurringTransaction.mock.calls[0][0];
}

describe("recurring definition built by handleTransactionSubmit", () => {
  beforeEach(() => {
    createRecurringTransaction.mockReset();
  });

  it("monthly gregorian takes the day from the start date", async () => {
    expect(await submittedDefinition(BASE)).toStrictEqual({
      start_date: "2026-10-28",
      next_due_date: "2026-10-28",
      frequency: "monthly",
      calendar_type: "gregorian",
      anchor_month_code: null,
      day_of_month: 28,
      total_occurrences: undefined,
      amount: 200,
      currency: "ILS",
      description: "Kollel",
      type: "donation",
      category: undefined,
      is_chomesh: false,
      recipient: "Kollel",
      payment_method: "credit_card",
      original_amount: undefined,
      original_currency: undefined,
      conversion_rate: undefined,
      conversion_date: undefined,
      rate_source: undefined,
    });
  });

  it("an explicit day and a total count win, and frequency defaults to monthly", async () => {
    expect(
      await submittedDefinition({
        ...BASE,
        type: "expense",
        isRecognized: true,
        category: "housing",
        recipient: null,
        description: null,
        payment_method: "",
        frequency: undefined,
        recurring_calendar_type: "gregorian",
        recurring_day_of_month: 15,
        recurringTotalCount: 12,
      }),
    ).toStrictEqual({
      start_date: "2026-10-28",
      next_due_date: "2026-11-15",
      frequency: "monthly",
      calendar_type: "gregorian",
      anchor_month_code: null,
      day_of_month: 15,
      total_occurrences: 12,
      amount: 200,
      currency: "ILS",
      description: undefined,
      type: "recognized-expense",
      category: "housing",
      is_chomesh: false,
      recipient: undefined,
      payment_method: undefined,
      original_amount: undefined,
      original_currency: undefined,
      conversion_rate: undefined,
      conversion_date: undefined,
      rate_source: undefined,
    });
  });

  it("monthly hebrew without a day uses the Gregorian day number of the start date", async () => {
    expect(
      await submittedDefinition({ ...BASE, recurring_calendar_type: "hebrew" }),
    ).toMatchObject({
      start_date: "2026-10-28",
      next_due_date: "2026-11-08",
      calendar_type: "hebrew",
      anchor_month_code: null,
      day_of_month: 28,
    });
  });

  it("yearly hebrew anchors the Hebrew month of the start date", async () => {
    expect(
      await submittedDefinition({
        ...BASE,
        frequency: "yearly",
        recurring_calendar_type: "hebrew",
        recurring_day_of_month: 20,
        is_chomesh: true,
        isFromPersonalFunds: true,
      }),
    ).toStrictEqual({
      start_date: "2026-10-28",
      next_due_date: "2026-10-31",
      frequency: "yearly",
      calendar_type: "hebrew",
      anchor_month_code: "M02",
      day_of_month: 20,
      total_occurrences: undefined,
      amount: 200,
      currency: "ILS",
      description: "Kollel",
      type: "non_tithe_donation",
      category: undefined,
      is_chomesh: true,
      recipient: "Kollel",
      payment_method: "credit_card",
      original_amount: undefined,
      original_currency: undefined,
      conversion_rate: undefined,
      conversion_date: undefined,
      rate_source: undefined,
    });
  });

  it("foreign currency keeps the conversion fields", async () => {
    expect(
      await submittedDefinition({
        ...BASE,
        amount: 370,
        type: "income",
        isExempt: true,
        frequency: "weekly",
        original_amount: 100,
        original_currency: "USD",
        conversion_rate: 3.7,
        conversion_date: "2026-10-28",
        rate_source: "manual",
      }),
    ).toStrictEqual({
      start_date: "2026-10-28",
      next_due_date: "2026-10-28",
      frequency: "weekly",
      calendar_type: "gregorian",
      anchor_month_code: null,
      day_of_month: 28,
      total_occurrences: undefined,
      amount: 370,
      currency: "ILS",
      description: "Kollel",
      type: "exempt-income",
      category: undefined,
      is_chomesh: false,
      recipient: "Kollel",
      payment_method: "credit_card",
      original_amount: 100,
      original_currency: "USD",
      conversion_rate: 3.7,
      conversion_date: "2026-10-28",
      rate_source: "manual",
    });
  });
});
