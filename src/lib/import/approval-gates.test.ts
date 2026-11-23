import { describe, expect, it } from "vitest";
import { getApprovedRows, rowBlocksApproval } from "./approval-gates";
import type { ImportPreviewRow } from "./import-session.types";

function baseRow(
  overrides: Partial<ImportPreviewRow> &
    Pick<ImportPreviewRow, "id" | "status" | "issues" | "approved">,
): ImportPreviewRow {
  return {
    rowNumber: 1,
    raw: {},
    mapped: { debit: -50 },
    normalized: {
      date: "2026-11-07",
      amount: 50,
      currency: "ILS",
      type: null,
      description: "החזר",
      category: null,
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
    },
    ...overrides,
  };
}

describe("rowBlocksApproval / getApprovedRows", () => {
  it("blocks card_refund rows and excludes them from approved persist set", () => {
    const refund = baseRow({
      id: "refund",
      status: "needs_review",
      issues: [{ code: "card_refund" }],
      approved: true,
    });
    expect(rowBlocksApproval(refund)).toBe(true);
    expect(getApprovedRows([refund])).toEqual([]);
  });

  it("blocks rows with unset type even without the issue code", () => {
    const unset = baseRow({
      id: "unset",
      status: "ready",
      issues: [],
      approved: true,
      normalized: {
        date: "2026-11-07",
        amount: 50,
        currency: "ILS",
        type: null,
        description: "x",
        category: null,
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
      },
    });
    expect(rowBlocksApproval(unset)).toBe(true);
    expect(getApprovedRows([unset])).toEqual([]);
  });

  it("allows approved ready rows with an explicit type", () => {
    const ready = baseRow({
      id: "ok",
      status: "ready",
      issues: [],
      approved: true,
      normalized: {
        date: "2026-11-07",
        amount: 50,
        currency: "ILS",
        type: "expense",
        description: "purchase",
        category: null,
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
      },
    });
    expect(rowBlocksApproval(ready)).toBe(false);
    expect(getApprovedRows([ready])).toEqual([ready]);
  });
});
