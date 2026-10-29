import { describe, expect, it } from "vitest";
import {
  buildReplyBlocks,
  emptyReplyState,
  nextConversation,
  type ReplyState,
} from "./assistant-reply-view";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";

const draft: TextTransactionDraft = {
  date: "2026-10-21",
  amount: 15,
  currency: "ILS",
  type: "expense",
  requestedRate: null,
  description: "מאפים באליס",
  category: "food",
  paymentMethod: null,
};

function state(overrides: Partial<ReplyState> = {}): ReplyState {
  return { ...emptyReplyState(), ...overrides };
}

describe("buildReplyBlocks", () => {
  it("returns nothing for an empty reply", () => {
    expect(buildReplyBlocks(emptyReplyState())).toEqual([]);
  });

  it("shows only the one-at-a-time message, without the transaction label", () => {
    const blocks = buildReplyBlocks(state({ intent: "add_transaction", status: "oneAtATime" }));
    expect(blocks.some((block) => block.kind === "intent")).toBe(false);
    expect(blocks).toContainEqual({ kind: "status", status: "oneAtATime" });
  });

  it("shows thinking while a sentence is being checked", () => {
    expect(buildReplyBlocks(state({ checking: true }))).toEqual([{ kind: "thinking", phase: "reading" }]);
  });

  it("names the kind of work while a receipt or a duplicate scan is in flight", () => {
    expect(buildReplyBlocks(state({ checking: true, pendingPhase: "receipt" }))).toEqual([
      { kind: "thinking", phase: "receipt" },
    ]);
    const scanning = buildReplyBlocks(state({
      intent: "find_duplicates",
      duplicateScan: { status: "pending" },
    }));
    expect(scanning.map((block) => block.kind === "thinking" ? block : block.kind)).toContainEqual({
      kind: "thinking",
      phase: "duplicates",
    });
  });

  it("shows calculating while a data answer is still loading", () => {
    const blocks = buildReplyBlocks(state({ intent: "ask_data" }));
    expect(blocks).toEqual([
      { kind: "intent", intent: "ask_data", showNotSaved: false },
      { kind: "thinking", phase: "data" },
    ]);
  });

  it("locks a saved draft and keeps undo last", () => {
    const blocks = buildReplyBlocks(state({
      intent: "add_transaction",
      draft: {
        draft,
        amountInput: "15",
        appliedRuleName: null,
        duplicates: [],
        duplicatesRanked: false,
      },
      status: "saved",
      savedItemId: "item-1",
    }));
    expect(blocks.map((block) => block.kind)).toEqual(["intent", "draft", "status", "undo"]);
    expect(blocks[0]).toMatchObject({ kind: "intent", showNotSaved: false });
    expect(blocks[1]).toMatchObject({ kind: "draft", view: { locked: true } });
  });

  it("asks which family without claiming nothing was saved", () => {
    const blocks = buildReplyBlocks(state({
      intent: "ask_data",
      dataReply: { status: "family_missing", source: "כמה" },
    }));
    expect(blocks.map((block) => block.kind)).toEqual(["intent", "askFamily"]);
    expect(blocks[0]).toMatchObject({ showNotSaved: false });
  });

  it("shows a receipt only beside a type question or a draft", () => {
    const alone = buildReplyBlocks(state({
      intent: "add_transaction",
      receiptArtifactId: "art-1",
    }));
    expect(alone.map((block) => block.kind)).toEqual(["intent"]);

    const asked = buildReplyBlocks(state({
      intent: "add_transaction",
      clarification: "type",
      receiptArtifactId: "art-1",
    }));
    expect(asked.map((block) => block.kind)).toEqual(["intent", "askType", "receipt"]);
  });

  it("shows a receipt failure even when no intent was chosen", () => {
    expect(buildReplyBlocks(state({ status: "providerFailed" }))).toEqual([
      { kind: "status", status: "providerFailed" },
    ]);
  });

  it("keeps every message when two turns are sent before a repaint", () => {
    const first = nextConversation([], null, [], { kind: "text", text: "ראשונה" }, "1");
    const second = nextConversation(first.history, first.active, [], { kind: "text", text: "שנייה" }, "2");
    expect(second.history.map((turn) => turn.user)).toEqual([{ kind: "text", text: "ראשונה" }]);
    expect(second.active).toEqual({ kind: "text", text: "שנייה" });
  });

  it("does not freeze a spinner onto a turn that was replaced mid-check", () => {
    const next = nextConversation(
      [],
      { kind: "text", text: "ראשונה" },
      [{ kind: "thinking", phase: "reading" }],
      { kind: "text", text: "שנייה" },
      "2",
    );
    expect(next.history[0]?.blocks).toEqual([]);
  });
});
