import { describe, expect, it } from "vitest";
import type { ImportPreviewRow } from "./import-session.types";
import { applyBulkEdit } from "./bulk-edit";

function baseNormalized(
  overrides: Partial<NonNullable<ImportPreviewRow["normalized"]>> = {},
): NonNullable<ImportPreviewRow["normalized"]> {
  return {
    date: "2026-01-15",
    amount: 100,
    currency: "ILS",
    type: "expense",
    description: "Row",
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
    ...overrides,
  };
}

function row(
  overrides: Partial<ImportPreviewRow> & { id: string; rowNumber: number },
): ImportPreviewRow {
  const { normalized, ...rest } = overrides;
  return {
    raw: {},
    mapped: {},
    status: "ready",
    issues: [],
    approved: true,
    ...rest,
    normalized: normalized ?? baseNormalized(),
  };
}

const context = {
  existingTransactions: [],
  recurringTransactions: [],
};

describe("applyBulkEdit", () => {
  it("changes type on selected rows", () => {
    const rows = [
      row({ id: "a", rowNumber: 1 }),
      row({ id: "b", rowNumber: 2 }),
    ];

    const next = applyBulkEdit(rows, ["a"], { type: "income" }, context);

    expect(next[0]?.normalized?.type).toBe("income");
    expect(next[1]?.normalized?.type).toBe("expense");
  });

  it("clears category when the type family changes and no category is given", () => {
    const rows = [row({ id: "a", rowNumber: 1 })];

    const next = applyBulkEdit(rows, ["a"], { type: "income" }, context);

    expect(next[0]?.normalized?.type).toBe("income");
    expect(next[0]?.normalized?.category).toBeNull();
  });

  it("keeps category when the type family stays the same", () => {
    const rows = [row({ id: "a", rowNumber: 1 })];

    const next = applyBulkEdit(
      rows,
      ["a"],
      { type: "recognized-expense" },
      context,
    );

    expect(next[0]?.normalized?.type).toBe("recognized-expense");
    expect(next[0]?.normalized?.category).toBe("food");
  });

  it("sets category when provided even across family changes", () => {
    const rows = [row({ id: "a", rowNumber: 1 })];

    const next = applyBulkEdit(
      rows,
      ["a"],
      { type: "income", category: "salary" },
      context,
    );

    expect(next[0]?.normalized?.type).toBe("income");
    expect(next[0]?.normalized?.category).toBe("salary");
  });

  it("unapproves rows that revalidation marks invalid", () => {
    const rows = [
      row({
        id: "a",
        rowNumber: 1,
        approved: true,
        normalized: baseNormalized({ description: "Gift" }),
      }),
    ];

    const next = applyBulkEdit(rows, ["a"], { type: "donation" }, context);

    expect(next[0]?.status).toBe("invalid");
    expect(next[0]?.approved).toBe(false);
    expect(next[0]?.issues.some((i) => i.code === "donation_recipient_required")).toBe(
      true,
    );
  });

  it("leaves ids outside the selection untouched", () => {
    const rows = [
      row({ id: "a", rowNumber: 1, approved: true }),
      row({
        id: "b",
        rowNumber: 2,
        approved: true,
        status: "needs_review",
        issues: [{ code: "possible_duplicate" }],
      }),
    ];

    const next = applyBulkEdit(rows, ["a"], { type: "income" }, context);

    expect(next[1]).toEqual(rows[1]);
    expect(next[0]?.normalized?.type).toBe("income");
  });
});
