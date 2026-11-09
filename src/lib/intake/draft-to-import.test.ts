import { describe, expect, it } from "vitest";
import { transactionDraftV1Schema, type TransactionDraftV1 } from "./contracts";
import { draftToNormalizedRow } from "./draft-to-import";

const BASE_DRAFT: TransactionDraftV1 = {
  schema_version: 1,
  date: "2026-10-16",
  amount: 100,
  currency: "USD",
  type: "expense",
  description: "books",
  category: "shopping",
  recipient: null,
  payment_method: "cash",
  is_chomesh: false,
  requested_rate: null,
};

describe("transactionDraftV1Schema", () => {
  it("accepts a source draft and rejects initial_balance and unknown currency", () => {
    expect(transactionDraftV1Schema.parse(BASE_DRAFT)).toEqual(BASE_DRAFT);
    expect(
      transactionDraftV1Schema.safeParse({ ...BASE_DRAFT, type: "initial_balance" }).success,
    ).toBe(false);
    expect(
      transactionDraftV1Schema.safeParse({ ...BASE_DRAFT, currency: "JPY" }).success,
    ).toBe(false);
  });
});

describe("draftToNormalizedRow", () => {
  it("does not convert when the currency is already the default", () => {
    const row = draftToNormalizedRow(
      { ...BASE_DRAFT, currency: "ILS", amount: -42.5, requested_rate: 3.7 },
      { defaultCurrency: "ILS", conversionDate: "2026-10-18" },
    );

    expect(row.amount).toBe(42.5);
    expect(row.currency).toBe("ILS");
    expect(row.original_amount).toBeNull();
    expect(row.original_currency).toBeNull();
    expect(row.conversion_rate).toBeNull();
    expect(row.conversion_date).toBeNull();
    expect(row.rate_source).toBeNull();
    expect(row.source_recurring_id).toBeNull();
    expect(row.occurrence_number).toBeNull();
  });

  it("keeps a foreign currency waiting when no rate was requested", () => {
    const row = draftToNormalizedRow(BASE_DRAFT, { defaultCurrency: "ILS" });

    expect(row.amount).toBe(100);
    expect(row.currency).toBe("USD");
    expect(row.original_amount).toBe(100);
    expect(row.original_currency).toBe("USD");
    expect(row.conversion_rate).toBeNull();
    expect(row.conversion_date).toBeNull();
    expect(row.rate_source).toBeNull();
    expect(row.description).toBe("books");
    expect(row.type).toBe("expense");
  });

  it("applies a requested manual rate with toFixed amount semantics", () => {
    const row = draftToNormalizedRow(
      { ...BASE_DRAFT, amount: -100, requested_rate: 3.71235 },
      { defaultCurrency: "ILS", conversionDate: "2026-10-18" },
    );

    expect(row.amount).toBe(371.24);
    expect(row.currency).toBe("ILS");
    expect(row.original_amount).toBe(100);
    expect(row.original_currency).toBe("USD");
    expect(row.conversion_rate).toBe(3.7124);
    expect(row.conversion_date).toBe("2026-10-18");
    expect(row.rate_source).toBe("manual");
  });
});
