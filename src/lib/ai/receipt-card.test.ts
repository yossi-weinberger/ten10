import { describe, expect, it } from "vitest";
import { isIsoDate, receiptAsDraft, receiptRuledDraft, type ReceiptFields } from "./receipt-card";

const fields: ReceiptFields = {
  date: "2026-10-18",
  amount: 180,
  currency: "ILS",
  description: "בית כנסת",
};

describe("receiptAsDraft", () => {
  it("keeps the type the caller supplies", () => {
    expect(receiptAsDraft(fields, "donation").type).toBe("donation");
    expect(receiptAsDraft(fields, "income").type).toBe("income");
  });

  it("does not invent a type when no rule matches", () => {
    expect(receiptRuledDraft(fields, [])).toBeNull();
  });

  it("uses a saved rule instead of asking", () => {
    const ruled = receiptRuledDraft(fields, [{ name: "בית כנסת", type: "non_tithe_donation" }]);
    expect(ruled?.draft.type).toBe("non_tithe_donation");
    expect(ruled?.ruleName).toBe("בית כנסת");
  });

  it("rejects a calendar date that is not a real day", () => {
    expect(isIsoDate("2026-10-18")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});
