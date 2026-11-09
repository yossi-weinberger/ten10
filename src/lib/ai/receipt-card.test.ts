import { describe, expect, it } from "vitest";
import { isIsoDate, receiptAsDraft, type ReceiptFields } from "./receipt-card";

const fields: ReceiptFields = {
  date: "2026-10-18",
  amount: 180,
  currency: "ILS",
  description: "בית כנסת",
  checkDate: false,
  ruleName: null,
  ruledType: null,
};

describe("receiptAsDraft", () => {
  it("keeps the type the caller supplies", () => {
    expect(receiptAsDraft(fields, "donation").type).toBe("donation");
    expect(receiptAsDraft(fields, "income").type).toBe("income");
  });

  it("keeps a type the reader took from a saved rule", () => {
    const ruled = receiptAsDraft(
      { ...fields, ruleName: "בית כנסת", ruledType: "non_tithe_donation" },
      "non_tithe_donation",
    );
    expect(ruled.type).toBe("non_tithe_donation");
    expect(ruled.description).toBe("בית כנסת");
  });

  it("rejects a calendar date that is not a real day", () => {
    expect(isIsoDate("2026-10-18")).toBe(true);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});
