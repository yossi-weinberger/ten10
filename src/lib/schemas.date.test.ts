import { describe, expect, it } from "vitest";
import { createTransactionFormSchema } from "./schemas";
import { MIN_TRANSACTION_DATE } from "./utils/transaction-date";

const t = (key: string) => key;

function validTransaction(overrides: Record<string, unknown> = {}) {
  return {
    amount: 100,
    currency: "ILS",
    date: "2026-09-12",
    type: "income",
    isExempt: false,
    isRecognized: false,
    isFromPersonalFunds: false,
    ...overrides,
  };
}

describe("transaction form date minimum", () => {
  const schema = createTransactionFormSchema(t as never);

  it("accepts the minimum allowed date", () => {
    const result = schema.safeParse(validTransaction({ date: MIN_TRANSACTION_DATE }));
    expect(result.success).toBe(true);
  });

  it("rejects dates before 2000-01-01", () => {
    const result = schema.safeParse(validTransaction({ date: "1999-12-31" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("date"))).toBe(
        true,
      );
      expect(
        result.error.issues.some(
          (issue) =>
            issue.message === "transactions:transactionForm.validation.date.min",
        ),
      ).toBe(true);
    }
  });

  it("rejects the historic two-digit-year fallback date", () => {
    const result = schema.safeParse(validTransaction({ date: "1926-01-01" }));
    expect(result.success).toBe(false);
  });
});
