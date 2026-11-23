import { describe, expect, it, vi } from "vitest";
import type { ImportPreviewRow } from "./import-session.types";
import { applyBulkEdit } from "./bulk-edit";
import { revalidateAfterEdit } from "./validation";

vi.mock("./validation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./validation")>();
  return {
    ...actual,
    revalidateAfterEdit: vi.fn(actual.revalidateAfterEdit),
  };
});

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

function stubReady(): void {
  vi.mocked(revalidateAfterEdit).mockReturnValue({ issues: [], status: "ready" });
}

describe("applyBulkEdit", () => {
  it("changes type on selected rows", () => {
    stubReady();
    const rows = [
      row({ id: "a", rowNumber: 1 }),
      row({ id: "b", rowNumber: 2 }),
    ];

    const next = applyBulkEdit(rows, ["a"], { type: "income" }, context);

    expect(next[0]?.normalized?.type).toBe("income");
    expect(next[1]?.normalized?.type).toBe("expense");
  });

  it("clears category when the type family changes and no category is given", () => {
    stubReady();
    const rows = [row({ id: "a", rowNumber: 1 })];

    const next = applyBulkEdit(rows, ["a"], { type: "income" }, context);

    expect(next[0]?.normalized?.type).toBe("income");
    expect(next[0]?.normalized?.category).toBeNull();
  });

  it("keeps category when the type family stays the same", () => {
    stubReady();
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
    stubReady();
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

  it("unapproves rows when stubbed revalidation returns invalid", () => {
    vi.mocked(revalidateAfterEdit).mockReturnValue({
      issues: [{ code: "missing_required_field", field: "date" }],
      status: "invalid",
    });
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
    expect(next[0]?.issues.some((i) => i.code === "missing_required_field")).toBe(true);
  });

  it("leaves ids outside the selection untouched", () => {
    stubReady();
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

  it("keeps card_refund blocked on category-only bulk edit; type patch clears it", async () => {
    const validation = await vi.importActual<typeof import("./validation")>(
      "./validation",
    );
    vi.mocked(revalidateAfterEdit).mockImplementation(
      validation.revalidateAfterEdit,
    );

    const refundRow = row({
      id: "a",
      rowNumber: 1,
      approved: false,
      status: "needs_review",
      issues: [{ code: "card_refund" }],
      normalized: baseNormalized({ type: null, category: null, amount: 50 }),
    });

    const afterCategory = applyBulkEdit(
      [refundRow],
      ["a"],
      { category: "מזון" },
      context,
    );
    expect(afterCategory[0]?.normalized?.type).toBeNull();
    expect(afterCategory[0]?.issues.map((i) => i.code)).toContain("card_refund");
    expect(afterCategory[0]?.status).toBe("needs_review");

    const afterType = applyBulkEdit(
      [refundRow],
      ["a"],
      { type: "income" },
      context,
    );
    expect(afterType[0]?.normalized?.type).toBe("income");
    expect(afterType[0]?.issues.map((i) => i.code)).not.toContain("card_refund");
    expect(afterType[0]?.status).toBe("ready");
  });
});
