import { describe, expect, it } from "vitest";
import { buildCommitPayload } from "./build-commit-payload";
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

describe("buildCommitPayload", () => {
  it("converts a manual rate into the default currency", () => {
    const result = buildCommitPayload({
      draft,
      defaultCurrency: "ILS",
      autoRate: null,
      idempotencyKey: "key-1",
      timezone: "Asia/Jerusalem",
    });

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
    const result = buildCommitPayload({
      draft: { ...draft, requestedRate: null },
      defaultCurrency: "ILS",
      autoRate: null,
      idempotencyKey: "key-2",
      timezone: "Asia/Jerusalem",
    });

    expect(result).toEqual({ ok: false, reason: "NO_RATE" });
  });
});
