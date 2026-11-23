import { describe, expect, it } from "vitest";
import { checkCardRefund } from "./card-refund-detector";
import { revalidateAfterEdit } from "./validation";
import type { ImportPreviewRow } from "./import-session.types";

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
  it("drops card_refund after the user edits the row", () => {
    const row: ImportPreviewRow = {
      id: "r1",
      rowNumber: 1,
      raw: {},
      mapped: { debit: -50 },
      normalized: {
        date: "2026-11-07",
        amount: 50,
        currency: "ILS",
        type: "income",
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
    };

    const next = revalidateAfterEdit(row, {
      existingTransactions: [],
      recurringTransactions: [],
    });
    expect(next.issues.map((i) => i.code)).not.toContain("card_refund");
    expect(next.status).toBe("ready");
  });
});
