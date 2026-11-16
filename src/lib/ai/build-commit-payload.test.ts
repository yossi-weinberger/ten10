import { describe, expect, it, vi } from "vitest";
import { buildCommitPayload, donationRecipient } from "./build-commit-payload";
import type { TextTransactionDraft } from "./classify-intake";

const draft: TextTransactionDraft = {
  date: "2026-10-18",
  amount: 200,
  currency: "USD",
  type: "income",
  requestedRate: 3.5,
  description: "אתמול קיבלתי 200 דולר לפי שער 3.5",
  category: null,
  paymentMethod: null,
};

function build(next: TextTransactionDraft, isChomesh = false, defaultCurrency = "ILS", autoRate: number | null = null) {
  return buildCommitPayload({
    draft: next,
    defaultCurrency,
    autoRate,
    idempotencyKey: "key",
    timezone: "Asia/Jerusalem",
    isChomesh,
  });
}

describe("buildCommitPayload", () => {
  it("converts a manual rate into the default currency", () => {
    const result = build(draft);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.amount).toBe(700);
    expect(result.payload.currency).toBe("ILS");
    expect(result.payload.original_amount).toBe(200);
    expect(result.payload.original_currency).toBe("USD");
    expect(result.payload.rate_source).toBe("manual");
    expect(result.payload.category).toBeNull();
    expect(result.payload.payment_method).toBeNull();
  });

  it("refuses a foreign amount when no rate exists", () => {
    expect(build({ ...draft, requestedRate: null })).toEqual({ ok: false, reason: "NO_RATE" });
  });

  it("keeps chomesh on an income when the card says so", () => {
    const result = build(draft, true);
    expect(result.ok && result.payload.is_chomesh).toBe(true);
  });

  it("never sets chomesh on exempt income or on other types", () => {
    for (const type of ["exempt-income", "expense", "donation", "recognized-expense", "non_tithe_donation"] as const) {
      const result = build({ ...draft, type }, true);
      expect(result.ok && result.payload.is_chomesh).toBe(false);
    }
  });

  it("converts a pound amount for a shekel profile and keeps a pound amount for a pound profile", () => {
    const pound: TextTransactionDraft = { ...draft, currency: "GBP", requestedRate: null, type: "expense" };
    const shekel = build(pound, false, "ILS", 4.6);
    expect(shekel.ok && shekel.payload).toMatchObject({ amount: 920, currency: "ILS", original_currency: "GBP" });
    const own = build(pound, false, "GBP", null);
    expect(own.ok && own.payload).toMatchObject({ amount: 200, currency: "GBP", original_currency: null });
  });

  it("dates the rate today, like the form, not on the transaction date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 3, 9, 0));
    try {
      const auto = build({ ...draft, requestedRate: null }, false, "ILS", 3.7);
      expect(auto.ok && auto.payload).toMatchObject({ date: "2026-10-18", conversion_date: "2026-11-03", rate_source: "auto" });
      const typed = build(draft);
      expect(typed.ok && typed.payload).toMatchObject({ conversion_date: "2026-11-03", rate_source: "manual" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("saves the payee of a donation as the recipient", () => {
    const result = build({ ...draft, type: "donation", currency: "ILS", requestedRate: null, description: "חב\"ד" });
    expect(result.ok && result.payload.recipient).toBe("חב\"ד");
    const named = build({ ...draft, type: "non_tithe_donation", currency: "ILS", requestedRate: null, description: "תרומה", recipient: "ישיבה" });
    expect(named.ok && named.payload.recipient).toBe("ישיבה");
  });

  it("leaves the recipient empty for a non-donation", () => {
    const result = build({ ...draft, type: "expense", currency: "ILS", requestedRate: null, description: "מכולת" });
    expect(result.ok && result.payload.recipient).toBeNull();
  });
});

describe("donationRecipient", () => {
  it("is null for an empty donation description", () => {
    expect(donationRecipient({ type: "donation", description: "  ", recipient: null })).toBeNull();
  });
});
