import { describe, expect, it } from "vitest";
import type { YearTypeSum } from "@/lib/ai/classify-intake";
import {
  isSingleReceipt,
  limitStatus,
  namedQuestionAnswer,
  openReceiptFailureStatus,
  parsedRuleFromCard,
  publishedPageNamespace,
  readyDataReply,
  receiptFailureStatus,
  receiptRouteStatus,
  sumFailureStatus,
  unnamedQuestionAnswer,
  voiceFailureStatus,
} from "./assistant-drawer-intent";

const question: YearTypeSum = {
  year: 2026,
  month: 10,
  months: 12,
  measure: "sum",
  type: "donation",
  paymentMethod: null,
  recipient: "בית חולים",
  topic: null,
  from: "2026-01-01",
  to: "2026-12-31",
};

describe("isSingleReceipt", () => {
  it("accepts only a readable single receipt", () => {
    expect(isSingleReceipt({
      ok: true,
      route: "receipt",
      fields: {
        date: "2026-11-01",
        checkDate: false,
        amount: 15,
        currency: "ILS",
        description: "מאפים",
        ruleName: null,
        ruledType: null,
      },
      artifactId: "a1",
    })).toBe(true);
    expect(isSingleReceipt({ ok: true, route: "statement" })).toBe(false);
    expect(isSingleReceipt({ ok: false, reason: "UNREADABLE" })).toBe(false);
    expect(isSingleReceipt({ ok: false, reason: "LIMIT", limit: { kind: "daily_limit", resetsAt: null } })).toBe(false);
  });
});

describe("publishedPageNamespace", () => {
  it("keeps only a published page", () => {
    expect(publishedPageNamespace("tithes")).toBe("halacha-tithes");
    expect(publishedPageNamespace("personal")).toBeNull();
    expect(publishedPageNamespace("none")).toBeNull();
    expect(publishedPageNamespace(null)).toBeNull();
  });
});

describe("parsedRuleFromCard", () => {
  it("keeps a known action and treats any other as ambiguous", () => {
    expect(parsedRuleFromCard({ type: "rule", name: "גן", action: "recognized-expense" })).toEqual({
      name: "גן",
      action: "recognized-expense",
    });
    expect(parsedRuleFromCard({ type: "rule", name: "גן", action: "other" })).toEqual({
      name: "גן",
      action: "ambiguous",
    });
    expect(parsedRuleFromCard({ type: "none" })).toBeNull();
  });
});

describe("status mapping", () => {
  it("maps a failed receipt, voice clip, and opened receipt", () => {
    expect(receiptFailureStatus({ ok: false, reason: "TOO_LARGE" })).toBe("receiptTooLarge");
    expect(receiptFailureStatus({ ok: false, reason: "UNAVAILABLE" })).toBe("providerFailed");
    expect(receiptFailureStatus({ ok: false, reason: "UNREADABLE" })).toBe("receiptUnreadable");
    expect(receiptFailureStatus({ ok: false, reason: "LIMIT", limit: { kind: "daily_limit", resetsAt: null } })).toBe("limitDailyLimit");
    expect(receiptRouteStatus("several_receipts")).toBe("severalReceipts");
    expect(receiptRouteStatus("statement")).toBe("bankStatement");
    expect(voiceFailureStatus({ ok: false, reason: "TOO_LONG" })).toBe("voiceTooLong");
    expect(voiceFailureStatus({ ok: false, reason: "UNAVAILABLE" })).toBe("providerFailed");
    expect(voiceFailureStatus({ ok: false, reason: "UNHEARD" })).toBe("voiceUnheard");
    expect(voiceFailureStatus({ ok: false, reason: "LIMIT", limit: { kind: "rate_limited", resetsAt: null } })).toBe("limitRateLimited");
    expect(openReceiptFailureStatus({ status: "none" })).toBe("receiptMissing");
    expect(openReceiptFailureStatus({ status: "unavailable" })).toBe("receiptUnavailable");
    expect(openReceiptFailureStatus({ status: "limit", limit: { kind: "quota_exhausted", resetsAt: null } })).toBe("limitQuotaExhausted");
    expect(sumFailureStatus("MIXED")).toBe("mixed");
    expect(sumFailureStatus("FAILED")).toBe("failed");
  });
});

describe("limitStatus", () => {
  it("maps limit kinds to status keys", () => {
    expect(limitStatus({ kind: "daily_limit", resetsAt: null })).toBe("limitDailyLimit");
    expect(limitStatus({ kind: "quota_exhausted", resetsAt: "2026-12-01T00:00:00Z" })).toBe("limitQuotaExhausted");
    expect(limitStatus({ kind: "rate_limited", resetsAt: "2026-11-10T10:31:00Z" })).toBe("limitRateLimited");
  });
});

describe("readyDataReply", () => {
  it("uses the filter recipient on a donation, and the filter category otherwise", () => {
    expect(readyDataReply(question, {
      category: null,
      description: null,
      recipient: "בית חולים",
    }, { total: 100, count: 2, currency: "ILS" })).toMatchObject({
      status: "ready",
      recipient: "בית חולים",
      category: null,
      total: 100,
      count: 2,
    });
    const expense = { ...question, type: "expense" as const, recipient: null, topic: "מזון" };
    expect(readyDataReply(expense, {
      category: null,
      description: "מזון",
      recipient: null,
    }, { total: 40, count: 1, currency: "ILS" }).category).toBe("מזון");
  });
});

describe("namedQuestionAnswer", () => {
  it("fills a donation recipient or an expense topic", () => {
    expect(namedQuestionAnswer(question, "בית חולים").filter).toEqual({
      category: null,
      description: null,
      recipient: "בית חולים",
    });
    const expense = { ...question, type: "expense" as const, recipient: null, topic: null };
    expect(namedQuestionAnswer(expense, "מזון").question.topic).toBe("מזון");
    expect(unnamedQuestionAnswer(question)).toEqual({
      question: { ...question, recipient: null, topic: null },
      filter: { category: null, description: null, recipient: null },
    });
  });
});
