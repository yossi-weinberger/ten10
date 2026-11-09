import { describe, expect, it } from "vitest";
import type { AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import { contextFor, decideTurn, emptyConversation, openCardEvidence, readerHasMovement, rememberClosed, rememberDraft, rememberSaved, rememberUndone, summarizeTurn, withLiveCard, type TurnInput, type TurnReader } from "./assistant-turn";

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

  it("asks about a guessed special type and shows a stated one on the card", () => {
    const guessed = decideTurn(base({
      reader: { ok: true, route: "several", items: [item({ typeHint: "income", typeQuestion: "exempt-income" })], rule: null, question: null },
    }));
    expect(guessed.card).toEqual({ type: "clarify", field: "special" });
    const statedInput = base({
      reader: {
        ok: true,
        route: "several",
        items: [item({ typeHint: "income", typeQuestion: "exempt-income", specialStated: true })],
        rule: null,
        question: null,
      },
    });
    const stated = decideTurn(statedInput);
    expect(stated.card.type).toBe("draft");
    expect(summarizeTurn(statedInput, stated).type).toBe("exempt-income");
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
    expect(decision.card.type).toBe("recurring");
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

  it("shows the standing order the reader read when Jev says add_transaction", () => {
    const monthly = item({
      recurrence: {
        frequency: "monthly",
        calendarType: "gregorian",
        startDate: "2026-11-01",
        dayOfMonth: 10,
        weekday: null,
        totalOccurrences: null,
        alreadyCharged: false,
      },
    });
    const reader: TurnReader = { ok: true, route: "several", items: [monthly], rule: null, question: null };
    const decision = decideTurn(base({ reader }));
    expect(decision.card.type).toBe("recurring");
    expect(decision.intent).toBe("create_recurring");
    expect(decision.releaseAs).toBe("create_recurring");
    expect(summarizeTurn(base({ reader }), decision).kind).toBe("recurring");

    const several: TurnReader = { ok: true, route: "several", items: [monthly, item({ amount: 30 })], rule: null, question: null };
    expect(decideTurn(base({ reader: several })).card.type).toBe("drafts");

    const chosen = decideTurn(base({ reader, forcedIntent: "add_transaction" }));
    expect(chosen.card.type).toBe("draft");
    expect(chosen.intent).toBe("add_transaction");

    const ruled = decideTurn(base({
      jev: { ok: true, intent: "create_rule", confidence: 0.95 },
      reader: { ...reader, rule: { match: "כולל", action: "non_tithe_donation" } },
    }));
    expect(ruled.card.type).toBe("rule");
  });

  it("asks when an unsure Jev leans to a standing order the reader could not read", () => {
    const reader: TurnReader = { ok: true, route: "several", items: [item({ amount: 100 })], rule: null, question: null };
    const unsure = decideTurn(base({ jev: { ok: true, intent: "create_recurring", confidence: 0.57 }, reader }));
    expect(unsure.mode).toBe("ask");
    expect(unsure.card.type).toBe("none");
    const sure = decideTurn(base({ jev: { ok: true, intent: "create_recurring", confidence: 0.95 }, reader }));
    expect(sure.card.type).toBe("recurring");
    const otherLabel = decideTurn(base({ jev: { ok: true, intent: "create_rule", confidence: 0.4 }, reader }));
    expect(otherLabel.intent).toBe("add_transaction");
  });

  it("keeps a standing order behind an out-of-scope label as no card", () => {
    const reader: TurnReader = {
      ok: true,
      route: "several",
      items: [item({ amount: null, recurrence: { frequency: "monthly", calendarType: "gregorian", startDate: "2026-11-01", dayOfMonth: 10, weekday: null, totalOccurrences: null, alreadyCharged: false } })],
      rule: null,
      question: null,
    };
    const decision = decideTurn(base({ jev: { ok: true, intent: "out_of_scope", confidence: 0.95 }, reader }));
    expect(decision.card.type).toBe("none");
  });

  it("blocks an unsupported frequency whatever Jev's label", () => {
    const decision = decideTurn(base({
      reader: { ok: true, route: "several", items: [item({ unsupportedFrequency: true })], rule: null, question: null },
    }));
    expect(decision.card.type).toBe("frequency_unsupported");
    expect(decision.frequencyBlocked).toBe(true);
  });

  it("keeps the rule card beside the frequency notice", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "create_rule", confidence: 0.95 },
      reader: {
        ok: true,
        route: "several",
        items: [item({ unsupportedFrequency: true })],
        rule: { match: "בית הכנסת", action: "non_tithe_donation" },
        question: null,
      },
    }));
    expect(decision.card).toEqual({ type: "rule", name: "בית הכנסת", action: "non_tithe_donation" });
    expect(decision.frequencyBlocked).toBe(true);
  });

  it("still loads the data answer beside the frequency notice", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "ask_data", confidence: 0.95 },
      reader: { ok: true, route: "several", items: [item({ amount: null, unsupportedFrequency: true })], rule: null, question: null },
    }));
    expect(decision.frequencyBlocked).toBe(true);
    expect(decision.needsQuestion).toBe(true);
  });

  it("shows a rule only when Jev says create_rule and the reader returned one", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "create_rule", confidence: 0.9 },
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

  it("answers the balance and the standing orders with no period or family", () => {
    for (const subject of ["balance", "standing_orders"] as const) {
      const decision = decideTurn(base({
        jev: { ok: true, intent: "ask_data", confidence: 0.9 },
        reader: { ok: true, route: "unreadable" },
        questionAttempted: true,
        question: {
          slots: { family: null, measure: null, recipient: null, category: null, paymentMethod: null, subject },
          period: null,
          nameText: null,
        },
      }));
      expect(decision.data.status).toBe(subject);
      expect(decision.pending).toBeNull();
      expect(summarizeTurn(base(), decision).kind).toBe(subject);
      expect(decision.nextState.onScreen?.kind).toBe("data_answer");
    }
  });

  it("asks which period when the question reader has no period", () => {
    const decision = decideTurn(base({
      message: "כמה הוצאות?",
      jev: { ok: true, intent: "ask_data", confidence: 0.9 },
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      question: {
        slots: { family: "expense", measure: "sum", recipient: null, category: null, paymentMethod: null },
        period: null,
        nameText: null,
      },
    }));
    expect(decision.pending?.kind).toBe("period");
    expect(decision.data.status).toBe("period_missing");
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

  it("builds the question from the chosen family when the question reader returned nothing", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "ask_data", confidence: 0.9 },
      forcedIntent: "ask_data",
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      question: null,
      chosenFamily: "donation",
      periodHold: { kind: "all" },
    }));
    expect(decision.data.status).toBe("ready");
  });

  it("prefers the held slots over a new read when the user picks a family", () => {
    const decision = decideTurn(base({
      jev: { ok: true, intent: "ask_data", confidence: 0.9 },
      forcedIntent: "ask_data",
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      question: {
        slots: { family: null, measure: "count", recipient: "כולל", category: null, paymentMethod: null },
        period: { kind: "all" },
        nameText: null,
      },
      chosenFamily: "donation",
      slotHold: { family: null, measure: null, recipient: "ישיבה", category: null, paymentMethod: null },
    }));
    expect(decision.data.status).toBe("ready");
    const question = decision.data.status === "ready" ? decision.data.question : null;
    expect(question?.recipient).toBe("ישיבה");
    expect(question?.measure).toBe("sum");
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

  it("remembers the user's words and the open draft, from the state before the turn", () => {
    const state = emptyConversation();
    const first = decideTurn(base({ state }));
    expect(first.nextState.recentUserTexts).toEqual(["קניתי לחם ב-15"]);
    expect(first.nextState.onScreen?.kind).toBe("draft");
    expect(first.nextState.onScreen?.line).toContain("expense 15 ILS");
    expect(state.recentUserTexts).toEqual([]);
    // A second decision in the same turn does not add the message twice.
    expect(decideTurn(base({ state })).nextState).toEqual(first.nextState);
    expect(contextFor(first.nextState)).toContain("1. \"קניתי לחם ב-15\"");
  });

  it("keeps three messages, uses the user's own words, and remembers a pending question", () => {
    let state = emptyConversation();
    for (const text of ["א", "ב", "ג", "ד"]) state = decideTurn(base({ state, message: text })).nextState;
    expect(state.recentUserTexts).toEqual(["ב", "ג", "ד"]);
    const joined = decideTurn(base({ state: emptyConversation(), message: "קניתי לחם 20", userText: "20" }));
    expect(joined.nextState.recentUserTexts).toEqual(["20"]);
    const waiting = decideTurn(base({
      jev: { ok: true, intent: "ask_data", confidence: 0.9 },
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      question: { slots: { family: "expense", measure: "sum", recipient: null, category: null, paymentMethod: null }, period: null, nameText: null },
    }));
    expect(waiting.nextState.pending?.kind).toBe("period");
    expect(waiting.nextState.onScreen).toBeNull();
  });

  it("closes the card after a save and an undo", () => {
    const open = decideTurn(base()).nextState;
    const saved = rememberSaved(open, "item-1");
    expect(saved.onScreen).toMatchObject({ kind: "saved", savedItemId: "item-1" });
    expect(saved.pending).toBeNull();
    expect(rememberUndone(saved).onScreen).toBeNull();
  });

  it("drops the open card when the reader says so, and only then", () => {
    const open = decideTurn(base()).nextState;
    const drop = { ok: true as const, route: "unreadable" as const, discards: true };
    const dropped = decideTurn(base({ message: "לא משנה", jev: { ok: true, intent: "out_of_scope", confidence: 0.9 }, reader: drop, state: open }));
    expect(dropped.card.type).toBe("discarded");
    expect(dropped.nextState.onScreen).toBeNull();
    const nothingOpen = decideTurn(base({ message: "לא משנה", jev: { ok: true, intent: "out_of_scope", confidence: 0.9 }, reader: drop }));
    expect(nothingOpen.card.type).not.toBe("discarded");
    const chosen = decideTurn(base({ reader: drop, state: open, forcedIntent: "add_transaction" }));
    expect(chosen.card.type).not.toBe("discarded");
    const dropAndGive = decideTurn(base({
      message: "לא, תמחק. תרמתי 50 לעזר מציון",
      reader: { ok: true, route: "several", items: [item({ amount: 50, description: "עזר מציון" })], rule: null, question: null, discards: true },
      state: open,
    }));
    expect(dropAndGive.card.type).not.toBe("discarded");
  });

  it("redraws the open card from the user's own edits, and only its words and amounts back an amount", () => {
    const fields = { amount: 120, currency: "ILS", type: "expense", description: "חלב", date: "2026-11-02" };
    const open = rememberDraft(emptyConversation(), "חלב 120", fields);
    const live = { recurring: null, saved: null };
    const edited = withLiveCard(open, { ...live, draft: { ...fields, amount: 150 } });
    expect(edited.onScreen?.line).toBe('one transaction, not saved: expense 150 ILS, "חלב", 2026-11-02, one time.');
    expect(openCardEvidence(edited)).toBe("150");
    expect(openCardEvidence(withLiveCard(open, { ...live, draft: fields }))).toBe("חלב 120\n120");
    expect(openCardEvidence(withLiveCard(open, { ...live, draft: { ...fields, date: "2026-11-01" } }))).toBe("120");
    expect(contextFor(edited)).not.toContain("120 ILS");
    const receipt = withLiveCard(rememberDraft(emptyConversation(), null, fields, "one receipt"), { ...live, draft: fields });
    expect(receipt.onScreen?.line.startsWith("one receipt, not saved")).toBe(true);
    expect(openCardEvidence(withLiveCard(open, { ...live, draft: { ...fields, amount: null } }))).toBe("");
    const savedLate = withLiveCard(open, { draft: fields, recurring: null, saved: { itemId: "item-1" } });
    expect(savedLate.onScreen).toMatchObject({ kind: "saved", savedItemId: "item-1" });
    // A saved single transaction can still be corrected, so its words keep backing its amount.
    expect(openCardEvidence(savedLate)).toBe("חלב 120\n120");
    const listSaved = withLiveCard(open, { draft: null, recurring: null, saved: { itemId: null } });
    expect(openCardEvidence(listSaved)).toBe("");
    expect(openCardEvidence(rememberClosed(open))).toBe("");
  });

  it("backs a list with every amount, and a standing order without the numbers the code wrote", () => {
    const list = decideTurn(base({
      message: "חלב 15 ולחם 30",
      reader: { ok: true, route: "several", items: [item({ amount: 15 }), item({ amount: 30, description: "לחם" })], rule: null, question: null },
    })).nextState;
    expect(openCardEvidence(list)).toBe("חלב 15 ולחם 30\n15 30");
    const order = decideTurn(base({
      message: "כל חודש 300 לעזר מציון",
      jev: { ok: true, intent: "create_recurring", confidence: 0.9 },
      reader: { ok: true, route: "several", items: [item({ amount: 300, recurrence: { frequency: "monthly", calendarType: "gregorian", startDate: null, dayOfMonth: 10, weekday: null, totalOccurrences: null, alreadyCharged: false } })], rule: null, question: null },
    })).nextState;
    expect(order.onScreen?.line).toContain("on day 10");
    expect(openCardEvidence(order)).toBe("כל חודש 300 לעזר מציון\n300");
  });

  it("says a continued list or standing order was already saved and keeps it as saved", () => {
    const saved = rememberSaved(decideTurn(base()).nextState, null);
    const more = decideTurn(base({
      message: "בעצם 20",
      reader: { ok: true, route: "several", items: [item({ amount: 20 })], rule: null, question: null, continues: true },
      state: saved,
    }));
    expect(more.card.type).toBe("already_saved");
    expect(more.replaces).toBeNull();
    expect(more.nextState.onScreen).toMatchObject({ kind: "saved" });
    expect(summarizeTurn(base(), more).kind).toBe("already_saved");
  });

  // QA 2026-11-03: "קפה 15", save, then "זה תרומה" got "not sure what you meant".
  it("turns a correction of the saved transaction into a card that replaces it", () => {
    const fields = { amount: 15, currency: "ILS", type: "expense", description: "קפה", date: "2026-11-01" };
    const saved = rememberSaved(decideTurn(base({ message: "קפה 15" })).nextState, "item-1", fields);
    expect(saved.onScreen?.line).toContain('saved and still open to a correction: expense 15 ILS, "קפה"');
    expect(openCardEvidence(saved)).toBe("קפה 15\n15");
    expect(contextFor(saved)).toContain("expense 15 ILS");
    const correction = base({
      message: "זה תרומה",
      jev: { ok: true, intent: "out_of_scope", confidence: 0.85 },
      reader: { ok: true, route: "several", items: [item({ amount: 15, typeHint: "donation", description: "קפה" })], rule: null, question: null, continues: true },
      state: saved,
    });
    const decision = decideTurn(correction);
    expect(decision.card.type).toBe("draft");
    expect(decision.intent).toBe("add_transaction");
    expect(decision.replaces).toBe("item-1");
    expect(summarizeTurn(correction, decision)).toMatchObject({ kind: "draft", amount: 15, type: "donation" });
    // A new message that does not continue the saved card replaces nothing.
    const fresh = decideTurn({ ...correction, reader: { ok: true, route: "several", items: [item({ amount: 15, typeHint: "donation" })], rule: null, question: null } });
    expect(fresh.replaces).toBeNull();
    // An edited amount: the old words no longer back an amount.
    const edited = rememberSaved(decideTurn(base({ message: "קפה 15" })).nextState, "item-1", { ...fields, amount: 18 });
    expect(openCardEvidence(edited)).toBe("18");
  });

  // QA 6: the same transaction again offered to replace the saved one, or was saved twice.
  it("tells the saved transaction again from a correction of it", () => {
    const fields = { amount: 15, currency: "ILS", type: "expense", description: "מאפים", date: "2026-11-01", category: null, paymentMethod: null, isChomesh: false };
    const saved = rememberSaved(decideTurn(base()).nextState, "item-1", fields);
    const again = (over: Partial<AnchoredSplitItem>, continues?: boolean) => decideTurn(base({
      state: saved,
      reader: { ok: true, route: "several", items: [item(over)], rule: null, question: null, ...(continues === undefined ? {} : { continues }) },
    }));
    // The same item, whatever the continue flag, and with spacing or case changed.
    for (const continues of [true, false, undefined]) {
      const decision = again({ description: " מאפים " }, continues);
      expect(decision.card.type).toBe("already_saved");
      expect(decision.replaces).toBeNull();
      expect(decision.nextState.onScreen).toMatchObject({ kind: "saved", savedItemId: "item-1" });
    }
    // A field the item leaves empty keeps the saved one.
    expect(again({ typeHint: "", currency: "", date: null }, true).card.type).toBe("already_saved");
    // Any changed field is a correction, and only a continuing one replaces.
    const changes: Partial<AnchoredSplitItem>[] = [{ amount: 20 }, { date: "2026-10-31" }, { typeHint: "donation" }, { description: "לחם" }, { paymentMethod: "cash" }, { category: "food" }];
    for (const change of changes) {
      expect(again(change, true)).toMatchObject({ card: { type: "draft" }, replaces: "item-1" });
      expect(again(change, false)).toMatchObject({ card: { type: "draft" }, replaces: null });
    }
    // A special type already answered on the saved card is not asked again.
    const special = rememberSaved(decideTurn(base()).nextState, "item-2", { ...fields, type: "recognized-expense" });
    const asked = decideTurn(base({
      state: special,
      reader: { ok: true, route: "several", items: [item({ typeQuestion: "recognized-expense" })], rule: null, question: null, continues: true },
    }));
    expect(asked.card.type).toBe("already_saved");
  });

  // QA: "לאיזה מקומות?" after a data answer asked "for which period?".
  it("asks a follow-up question about the period of the answer on screen", () => {
    const question = (period: { kind: "span"; from: string; to: string } | null) => ({
      slots: { family: "donation" as const, measure: "sum" as const, recipient: null, category: null, paymentMethod: null },
      period,
      nameText: null,
    });
    const answered = decideTurn(base({
      message: "כמה תרמתי החודש?",
      jev: { ok: true, intent: "ask_data", confidence: 0.99 },
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      question: question({ kind: "span", from: "2026-11-01", to: "2026-11-30" }),
    }));
    expect(answered.nextState.onScreen).toMatchObject({ kind: "data_answer", period: { from: "2026-11-01", to: "2026-11-30" } });
    const follow = decideTurn(base({
      message: "לאיזה מקומות?",
      jev: { ok: true, intent: "ask_data", confidence: 0.99 },
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      question: question(null),
      state: answered.nextState,
    }));
    expect(follow.data.status).toBe("ready");
    if (follow.data.status === "ready") expect([follow.data.question.from, follow.data.question.to]).toEqual(["2026-11-01", "2026-11-30"]);
    expect(follow.pending).toBeNull();
  });

  // QA: a personal halacha question that also read as a data question asked "for which period?".
  it("shows the rabbi card instead of asking for a period when the question is personal", () => {
    const decision = decideTurn(base({
      message: "אני מתלבט אם מותר לי לקזז מהמעשר את שכר הלימוד של הבן שלי",
      jev: { ok: true, intent: "ask_data", confidence: 0.9 },
      reader: { ok: true, route: "unreadable" },
      questionAttempted: true,
      forcedIntent: "ask_data",
      preferRabbi: true,
      question: { slots: { family: "expense", measure: "sum", recipient: null, category: null, paymentMethod: null }, period: null, nameText: null },
    }));
    expect(decision.data.status).toBe("rabbi");
    expect(decision.pending).toBeNull();
    expect(summarizeTurn(base(), decision).kind).toBe("rabbi");
  });

  // QA: "ממה בדיוק מפרישים מעשר?" got "I can't" with Jev sure (1.0) and the page at 0.63.
  it("shows Jev's best page when it is sure a published page answers the question", () => {
    const sure = decideTurn(base({
      message: "ממה בדיוק מפרישים מעשר?",
      jev: { ok: true, intent: "domain_adjacent", confidence: 1, halachaPage: "income", halachaPageConfidence: 0.63 },
      reader: { ok: true, route: "unreadable" },
    }));
    expect(sure.publishedPage).toBe("income");
    expect(summarizeTurn(base(), sure).kind).toBe("halacha");
    const unsure = decideTurn(base({
      jev: { ok: true, intent: "domain_adjacent", confidence: 0.5, halachaPage: "income", halachaPageConfidence: 0.63 },
      reader: { ok: true, route: "unreadable" },
    }));
    expect(unsure.publishedPage).toBeNull();
  });

  it("keeps the page on screen for a sure follow-up such as give an example", () => {
    const shown = decideTurn(base({
      message: "האם הכנסה משכר דירה חייבת במעשר",
      jev: { ok: true, intent: "domain_adjacent", confidence: 0.6, halachaPage: "income", halachaPageConfidence: 0.83 },
      reader: { ok: true, route: "unreadable" },
    }));
    expect(shown.nextState.onScreen).toMatchObject({ kind: "halacha", page: "income" });
    expect(contextFor(shown.nextState)).toContain("a published halacha page about income");
    const example = decideTurn(base({
      message: "תן דוגמה",
      jev: { ok: true, intent: "domain_adjacent", confidence: 0.91, halachaPage: "none", halachaPageConfidence: 0.54 },
      reader: { ok: true, route: "unreadable" },
      state: shown.nextState,
    }));
    expect(example.publishedPage).toBe("income");
    const fresh = decideTurn(base({
      message: "תן דוגמה",
      jev: { ok: true, intent: "domain_adjacent", confidence: 0.91, halachaPage: "none", halachaPageConfidence: 0.54 },
      reader: { ok: true, route: "unreadable" },
    }));
    expect(fresh.publishedPage).toBeNull();
  });

  // QA: a rule request with no name or type looped on "זו נראית כמו בקשה לכלל".
  it("remembers a rule request and takes the rule from the next message", () => {
    const asked = decideTurn(base({
      message: "אני רוצה ליצור כלל",
      jev: { ok: true, intent: "create_rule", confidence: 0.88 },
      reader: { ok: true, route: "several", items: [], rule: null, question: null },
    }));
    expect(asked.card.type).toBe("none");
    expect(asked.pending?.kind).toBe("rule");
    expect(asked.nextState.onScreen?.kind).toBe("rule");
    expect(contextFor(asked.nextState)).toContain("waiting for: rule");
    expect(summarizeTurn(base(), asked).kind).toBe("question");
    const answer = decideTurn(base({
      message: "גן הוא הוצאה מוכרת",
      jev: { ok: true, intent: "add_transaction", confidence: 0.6 },
      reader: { ok: true, route: "several", items: [], rule: { match: "גן", action: "recognized-expense" }, question: null },
      state: asked.nextState,
    }));
    expect(answer.card).toEqual({ type: "rule", name: "גן", action: "recognized-expense" });
    expect(answer.pending).toBeNull();
    expect(answer.nextState.onScreen?.line).toContain('"גן" as recognized-expense');
    // Chosen from "what is this message?": the same question, not a dead end.
    const chosen = decideTurn(base({
      message: "להבא כל מה שאני משלם לגן",
      jev: { ok: true, intent: "create_rule", confidence: 0.52 },
      reader: { ok: true, route: "several", items: [], rule: null, question: null },
      forcedIntent: "create_rule",
    }));
    expect(chosen.pending?.kind).toBe("rule");
  });

  it("carries a stated chomesh into the summary", () => {
    const input = base({
      message: "קיבלתי משכורת 8000, תוציא גם חומש",
      reader: { ok: true, route: "several", items: [item({ amount: 8000, typeHint: "income", description: "משכורת", chomesh: true })], rule: null, question: null },
    });
    expect(summarizeTurn(input, decideTurn(input)).chomesh).toBe(true);
  });

  it("continues an open draft even when Jev returns out_of_scope", () => {
    const openDraft = decideTurn(base()).nextState;
    const input2 = base({
      message: "בעצם 25",
      jev: { ok: true, intent: "out_of_scope", confidence: 0.8 },
      reader: { ok: true, route: "several", items: [item({ amount: 25 })], rule: null, question: null, continues: true },
      state: openDraft,
    });
    const more = decideTurn(input2);
    expect(more.intent).toBe("add_transaction");
    expect(more.card.type).toBe("draft");
    expect(summarizeTurn(input2, more).amount).toBe(25);
  });

  it("treats a list route as movement", () => {
    expect(readerHasMovement({ ok: true, route: "list" })).toBe(true);
    expect(readerHasMovement({ ok: true, route: "unreadable" })).toBe(false);
  });
});
