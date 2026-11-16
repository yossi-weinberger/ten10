import { describe, expect, it } from "vitest";
import { applyConversion } from "../../../supabase/functions/_shared/transaction-domain/currency-rules.ts";
import {
  AI_DRAFT,
  FILE_IMPORT,
} from "../../../supabase/functions/_shared/transaction-domain/transaction-types.ts";
import type { TransactionFormValues } from "@/lib/schemas";
import type { NormalizedTransactionRow } from "./import-session.types";
import { formValuesToNormalized, previewRowToTransaction } from "./row-edit-adapter";

const FOREIGN_ROW: NormalizedTransactionRow = {
  date: "2026-10-16",
  amount: 371.23,
  currency: "ILS",
  description: "books",
  type: "expense",
  category: "shopping",
  recipient: null,
  payment_method: null,
  is_chomesh: false,
  original_amount: 100,
  original_currency: "USD",
  conversion_rate: 3.7123,
  conversion_date: "2026-10-18",
  rate_source: "auto",
  source_recurring_id: null,
  occurrence_number: null,
};

function formValues(overrides: Partial<TransactionFormValues>): TransactionFormValues {
  return {
    date: "2026-10-16",
    amount: 100,
    currency: "USD",
    description: "books",
    type: "expense",
    category: "shopping",
    recipient: null,
    payment_method: null,
    is_chomesh: false,
    isExempt: false,
    isRecognized: false,
    isFromPersonalFunds: false,
    ...overrides,
  } as TransactionFormValues;
}

describe("import row edit adapter", () => {
  it("keeps all five conversion fields when an AI_DRAFT foreign row is opened and saved", () => {
    const opened = previewRowToTransaction({ id: "row-1", normalized: FOREIGN_ROW }, AI_DRAFT);

    expect(opened.amount).toBe(100);
    expect(opened.currency).toBe("USD");
    expect(opened.original_amount).toBe(100);
    expect(opened.original_currency).toBe("USD");
    expect(opened.conversion_rate).toBe(3.7123);
    expect(opened.conversion_date).toBe("2026-10-18");
    expect(opened.rate_source).toBe("auto");

    const submitted = applyConversion({
      originalAmount: opened.amount,
      originalCurrency: opened.currency,
      defaultCurrency: "ILS",
      rate: opened.conversion_rate ?? 0,
      conversionDate: opened.conversion_date,
      rateSource: opened.rate_source,
    });

    const saved = formValuesToNormalized(
      formValues({
        amount: submitted.amount,
        currency: "ILS",
        original_amount: submitted.original_amount,
        original_currency: submitted.original_currency,
        conversion_rate: submitted.conversion_rate,
        conversion_date: submitted.conversion_date,
        rate_source: submitted.rate_source,
      }),
      "ILS",
      FOREIGN_ROW,
      AI_DRAFT,
      "expense",
    );

    expect(saved.amount).toBe(371.23);
    expect(saved.currency).toBe("ILS");
    expect(saved.original_amount).toBe(100);
    expect(saved.original_currency).toBe("USD");
    expect(saved.conversion_rate).toBe(3.7123);
    expect(saved.conversion_date).toBe("2026-10-18");
    expect(saved.rate_source).toBe("auto");
  });

  it("clears conversion fields both ways for FILE_IMPORT", () => {
    const opened = previewRowToTransaction(
      { id: "row-2", normalized: FOREIGN_ROW },
      FILE_IMPORT,
    );
    expect(opened.amount).toBe(371.23);
    expect(opened.currency).toBe("ILS");
    expect(opened.original_amount).toBeNull();
    expect(opened.original_currency).toBeNull();
    expect(opened.conversion_rate).toBeNull();
    expect(opened.conversion_date).toBeNull();
    expect(opened.rate_source).toBeNull();

    const saved = formValuesToNormalized(
      formValues({
        amount: 371.23,
        currency: "ILS",
        original_amount: 100,
        original_currency: "USD",
        conversion_rate: 3.7123,
        conversion_date: "2026-10-18",
        rate_source: "auto",
      }),
      "ILS",
      FOREIGN_ROW,
      FILE_IMPORT,
      "expense",
    );

    expect(saved.original_amount).toBeNull();
    expect(saved.original_currency).toBeNull();
    expect(saved.conversion_rate).toBeNull();
    expect(saved.conversion_date).toBeNull();
    expect(saved.rate_source).toBeNull();
    expect(saved.source_recurring_id).toBeNull();
    expect(saved.occurrence_number).toBeNull();
  });
});
