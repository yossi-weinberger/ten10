import { describe, expect, it } from "vitest";
import type { YearTypeSum } from "@/lib/ai/classify-intake";
import {
  isSingleReceipt,
  namedQuestionAnswer,
  openReceiptFailureStatus,
  parsedRuleFromCard,
  publishedPageNamespace,
  readsSplitIntent,
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

describe("readsSplitIntent", () => {
  it("holds the reader for a movement, a rule, or a question", () => {
    expect(readsSplitIntent("add_transaction")).toBe(true);
    expect(readsSplitIntent("create_recurring")).toBe(true);
    expect(readsSplitIntent("create_rule")).toBe(true);
    expect(readsSplitIntent("ask_data")).toBe(true);
    expect(readsSplitIntent("ask")).toBe(true);
    expect(readsSplitIntent("help")).toBe(false);
    expect(readsSplitIntent("inspiration")).toBe(false);
  });
});

describe("status mapping", () => {
  it("maps a failed receipt, voice clip, and opened receipt", () => {
    expect(receiptFailureStatus("TOO_LARGE")).toBe("receiptTooLarge");
    expect(receiptFailureStatus("UNAVAILABLE")).toBe("providerFailed");
    expect(receiptFailureStatus("UNREADABLE")).toBe("receiptUnreadable");
    expect(receiptRouteStatus("several_receipts")).toBe("severalReceipts");
    expect(receiptRouteStatus("statement")).toBe("bankStatement");
    expect(voiceFailureStatus("TOO_LONG")).toBe("voiceTooLong");
    expect(voiceFailureStatus("UNAVAILABLE")).toBe("providerFailed");
    expect(voiceFailureStatus("UNHEARD")).toBe("voiceUnheard");
    expect(openReceiptFailureStatus("none")).toBe("receiptMissing");
    expect(openReceiptFailureStatus("unavailable")).toBe("receiptUnavailable");
    expect(sumFailureStatus("MIXED")).toBe("mixed");
    expect(sumFailureStatus("FAILED")).toBe("failed");
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
