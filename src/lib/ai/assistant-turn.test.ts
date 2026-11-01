import { describe, expect, it } from "vitest";
import type { AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import { decideTurn, emptyConversation, readerHasMovement, summarizeTurn, type TurnInput, type TurnReader } from "./assistant-turn";

function item(partial: Partial<AnchoredSplitItem>): AnchoredSplitItem {
  return {
    description: "מאפים",
    amount: 15,
    currency: "ILS",
    date: "2026-11-01",
    checkDate: false,
    checkAmount: false,
    typeHint: "expense",
    typeQuestion: null,
    requestedRate: null,
    paymentMethod: null,
    category: null,
    ruleId: null,
    ruleName: null,
    recurrence: null,
    unsupportedFrequency: false,
    ...partial,
  };
}

function base(over: Partial<TurnInput> = {}): TurnInput {
  return {
    message: "קניתי לחם ב-15",
    jev: { ok: true, intent: "add_transaction", confidence: 0.95 },
    reader: { ok: true, route: "several", items: [item({})], rule: null, question: null },
    question: null,
    questionAttempted: false,
    state: emptyConversation(),
    today: "2026-11-01",
    calendar: "gregorian",
    ...over,
  };
}

describe("decideTurn", () => {
  it("shows one draft when Jev and the reader agree on a transaction", () => {
    const decision = decideTurn(base());
    expect(decision.mode).toBe("show");
    expect(decision.intent).toBe("add_transaction");
    expect(decision.card).toEqual({ type: "draft", checkAmount: false, checkDate: false });
    expect(decision.pending).toBeNull();
    expect(decision.needsQuestion).toBe(false);
  });

  it("asks for the type when the reader left it empty", () => {
    const decision = decideTurn(base({
      reader: { ok: true, route: "several", items: [item({ typeHint: "" })], rule: null, question: null },
    }));
    expect(decision.card).toEqual({ type: "clarify", field: "type" });
  });

  it("waits for an amount when the reader has none", () => {
    const decision = decideTurn(base({
      reader: { ok: true, route: "several", items: [item({ amount: null })], rule: null, question: null },
    }));
    expect(decision.pending).toEqual({ kind: "amount", sourceText: "קניתי לחם ב-15" });
  });

  it("shows several cards when the reader returned more than one item", () => {
    const decision = decideTurn(base({
      reader: {
        ok: true,
        route: "several",
        dropped: 1,
        items: [item({ description: "מכולת", amount: 50 }), item({ description: "ישיבה", amount: 120, typeHint: "donation" })],
        rule: null,
        question: null,
      },
    }));
    expect(decision.card).toEqual({ type: "drafts", dropped: 1 });
  });

  it("keeps a standing order behind Jev's create_recurring label", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "create_recurring", confidence: 0.95 },
      reader: {
        ok: true,
        route: "several",
        items: [item({
          recurrence: {
            frequency: "monthly",
            calendarType: "gregorian",
            startDate: "2026-11-01",
            dayOfMonth: 10,
            weekday: null,
            totalOccurrences: null,
            alreadyCharged: false,
          },
        })],
        rule: null,
        question: null,
      },
    }));
    expect(decision.card).toMatchObject({ type: "recurring", index: 0 });
    expect(summarizeTurn(base({
      jev: { ok: true, intent: "create_recurring", confidence: 0.95 },
      reader: {
        ok: true,
        route: "several",
        items: [item({
          recurrence: {
            frequency: "monthly",
            calendarType: "gregorian",
            startDate: "2026-11-01",
            dayOfMonth: 10,
            weekday: null,
            totalOccurrences: null,
            alreadyCharged: false,
          },
        })],
        rule: null,
        question: null,
      },
    }), decision).kind).toBe("recurring");
  });

  it("shows a standing order when the reader found recurrence, whatever Jev labeled", () => {
    const reader: TurnReader = {
      ok: true,
      route: "several",
      items: [item({
        recurrence: {
          frequency: "monthly",
          calendarType: "gregorian",
          startDate: "2026-11-01",
          dayOfMonth: 10,
          weekday: null,
          totalOccurrences: null,
          alreadyCharged: false,
        },
      })],
      rule: null,
      question: null,
    };
    const decision = decideTurn(base({ reader }));
    expect(decision.card).toMatchObject({ type: "recurring", index: 0 });
    expect(summarizeTurn(base({ reader }), decision).kind).toBe("recurring");
  });

  it("shows a rule when the reader returned one and there is no transaction", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "add_transaction", confidence: 0.9 },
      reader: {
        ok: true,
        route: "several",
        items: [],
        rule: { match: "גן", action: "recognized-expense" },
        question: null,
      },
    }));
    expect(decision.card).toEqual({ type: "rule", name: "גן", action: "recognized-expense" });
  });

  it("keeps a special type on the transaction and does not offer the rule beside it", () => {
    const decision = decideTurn(base({
      reader: {
        ok: true,
        route: "several",
        items: [item({ typeHint: "exempt-income", description: "מתנה" })],
        rule: { match: "מתנה", action: "exempt-income" },
        question: null,
      },
    }));
    expect(decision.card.type).toBe("draft");
  });

  it("shows a published page even when Jev's label is help", () => {
    const decision = decideTurn(base({
      message: "מה זה מעשר?",
      jev: { ok: true, intent: "help", confidence: 0.95, halachaPage: "tithes", halachaPageConfidence: 0.9 },
      reader: { ok: true, route: "unreadable" },
    }));
    expect(decision.intent).toBe("domain_adjacent");
    expect(decision.publishedPage).toBe("tithes");
  });

  it("asks what the message is when Jev is unsure and there is no movement", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "add_transaction", confidence: 0.4 },
      reader: { ok: true, route: "unreadable" },
    }));
    expect(decision.mode).toBe("ask");
  });

  it("shows a published page above the floor even when the intent is out of scope", () => {
    const decision = decideTurn(base({
      message: "מה זה מעשר?",
      jev: { ok: true, intent: "out_of_scope", confidence: 0.95, halachaPage: "tithes", halachaPageConfidence: 0.95 },
      reader: { ok: true, route: "unreadable" },
    }));
    expect(decision.intent).toBe("domain_adjacent");
    expect(decision.publishedPage).toBe("tithes");
    expect(summarizeTurn(base(), decision).kind).toBe("halacha");
  });

  it("shows the rabbi card for a personal page when nothing else is on the turn", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "out_of_scope", confidence: 0.4, halachaPage: "personal", halachaPageConfidence: 0.2 },
      reader: { ok: true, route: "unreadable" },
    }));
    expect(decision.mode).toBe("rabbi");
  });

  it("prefers the transaction when the reader found an amount", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "out_of_scope", confidence: 0.2, halachaPage: "personal" },
      reader: { ok: true, route: "several", items: [item({})], rule: null, question: null },
    }));
    expect(decision.intent).toBe("add_transaction");
    expect(decision.mode).toBe("show");
  });

  it("answers for all time when a data question names no period", () => {
    const decision = decideTurn(base({
      message: "כמה תרמתי?",
      jev: { ok: true, intent: "ask_data", confidence: 0.9 },
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      question: {
        slots: { family: "donation", measure: "sum", recipient: null, category: null, paymentMethod: null },
        period: null,
        nameText: null,
      },
    }));
    expect(decision.pending).toBeNull();
    expect(decision.data.status).toBe("ready");
  });

  it("asks which family when the slots have none", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "ask_data", confidence: 0.9 },
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      question: {
        slots: { family: null, measure: "sum", recipient: null, category: null, paymentMethod: null },
        period: { kind: "all" },
        nameText: null,
      },
    }));
    expect(decision.data.status).toBe("family_missing");
    expect(decision.pending?.kind).toBe("family");
  });

  it("marks a missing saved name after the filter", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "ask_data", confidence: 0.9 },
      forcedIntent: "ask_data",
      questionAttempted: true,
      settledQuestion: {
        year: 2026,
        month: 11,
        type: "donation",
        measure: "sum",
        months: 1,
        paymentMethod: null,
        topic: null,
        recipient: "ישיבה",
        from: "2026-11-01",
        to: "2026-11-30",
      },
      nameCheck: { missing: "recipient", name: "ישיבה", suggestions: ["ישיבת נחלת"] },
    }));
    expect(decision.data.status).toBe("name_missing");
    expect(decision.pending?.kind).toBe("name");
  });

  it("leaves the conversation state unchanged", () => {
    const state = emptyConversation();
    const decision = decideTurn(base({ state }));
    expect(decision.nextState).toEqual(state);
    expect(decision.nextState).not.toBe(state);
  });

  it("treats a list route as movement", () => {
    expect(readerHasMovement({ ok: true, route: "list" })).toBe(true);
    expect(readerHasMovement({ ok: true, route: "unreadable" })).toBe(false);
  });
});
