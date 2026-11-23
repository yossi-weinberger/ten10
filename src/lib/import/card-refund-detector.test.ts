import { describe, expect, it } from "vitest";
import { checkCardRefund } from "./card-refund-detector";
import { revalidateAfterEdit } from "./validation";
import { rowBlocksApproval } from "./approval-gates";
import type { ImportPreviewRow } from "./import-session.types";

function refundRow(
  overrides: Partial<ImportPreviewRow> = {},
): ImportPreviewRow {
  return {
    id: "r1",
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
    status: "needs_review",
    issues: [{ code: "card_refund" }],
    approved: false,
    ...overrides,
  };
}

describe("checkCardRefund", () => {
  it("flags a negative debit charge as card_refund", () => {
    expect(checkCardRefund({ debit: -50 })).toEqual({ code: "card_refund" });
    expect(checkCardRefund({ debit: "₪ -50.00" })).toEqual({ code: "card_refund" });
  });

  it("ignores positive debit purchases and amount-only rows", () => {
    expect(checkCardRefund({ debit: 412.3 })).toBeNull();
    expect(checkCardRefund({ debit: "412.3" })).toBeNull();
    expect(checkCardRefund({ amount: -50 })).toBeNull();
    expect(checkCardRefund({})).toBeNull();
  });
});

describe("card_refund resolution via revalidateAfterEdit", () => {
  it("keeps card_refund when only category/description change (type still unset)", () => {
    const row = refundRow({
      normalized: {
        ...refundRow().normalized!,
        type: null,
        category: "מזון",
        description: "החזר מעודכן",
      },
    });

    const next = revalidateAfterEdit(row, {
      existingTransactions: [],
      recurringTransactions: [],
    });
    expect(next.issues.map((i) => i.code)).toContain("card_refund");
    expect(next.status).toBe("needs_review");
    expect(rowBlocksApproval({ ...row, ...next })).toBe(true);
  });

  it("drops card_refund only after an explicit type is set", () => {
    const row = refundRow({
      normalized: {
        ...refundRow().normalized!,
        type: "income",
      },
    });

    const next = revalidateAfterEdit(row, {
      existingTransactions: [],
      recurringTransactions: [],
    });
    expect(next.issues.map((i) => i.code)).not.toContain("card_refund");
    expect(next.status).toBe("ready");
    expect(
      rowBlocksApproval({ ...row, ...next, issues: next.issues, status: next.status }),
    ).toBe(false);
  });
});
