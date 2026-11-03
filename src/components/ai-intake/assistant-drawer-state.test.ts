import { describe, expect, it } from "vitest";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import {
  assistantIsThinking,
  buildDrawerReplyState,
  composerBusyKey,
  composerMode,
  conversationStarted,
  draftReplyView,
} from "./assistant-drawer-state";
import { emptyReplyState } from "./assistant-reply-view";

const draft: TextTransactionDraft = {
  date: "2026-11-01",
  amount: 15,
  currency: "ILS",
  type: "expense",
  requestedRate: null,
  description: "מאפים",
  category: "food",
  paymentMethod: null,
};

describe("draftReplyView", () => {
  it("marks inferred fields that still match the first fill", () => {
    expect(draftReplyView({
      draft,
      amountInput: "15",
      appliedRuleName: null,
      duplicates: [],
      duplicatesRanked: false,
      original: { description: "מאפים", amount: 15, date: "2026-11-01" },
    }).inferred).toEqual({ amount: true, date: true, description: true });
  });

  it("drops the inferred flags when there is no original fill", () => {
    expect(draftReplyView({
      draft,
      amountInput: "15",
      appliedRuleName: "גן",
      duplicates: [],
      duplicatesRanked: false,
      original: null,
    }).inferred).toBeUndefined();
  });

  it("notices a typed amount that no longer matches the first fill", () => {
    expect(draftReplyView({
      draft,
      amountInput: "20",
      appliedRuleName: null,
      duplicates: [],
      duplicatesRanked: false,
      original: { description: "מאפים", amount: 15, date: "2026-11-01" },
    }).inferred).toEqual({ amount: false, date: true, description: true });
  });
});

describe("buildDrawerReplyState", () => {
  it("keeps an empty reply empty", () => {
    expect(buildDrawerReplyState({ ...emptyReplyState() })).toEqual(emptyReplyState());
  });
});

describe("assistantIsThinking", () => {
  const idle = {
    checking: false,
    pendingPhase: null,
    askIntent: false,
    intent: null,
    dataReply: null,
    duplicateScan: null,
  } as const;

  it("is true while a message is being read", () => {
    expect(assistantIsThinking({ ...idle, checking: true })).toBe(true);
  });

  it("is true while a data answer is still loading", () => {
    expect(assistantIsThinking({ ...idle, intent: "ask_data" })).toBe(true);
  });

  it("is false when the user is choosing an intent", () => {
    expect(assistantIsThinking({ ...idle, intent: "ask_data", askIntent: true })).toBe(false);
  });

  it("is true while a duplicate scan is pending", () => {
    expect(assistantIsThinking({ ...idle, duplicateScan: { status: "pending" } })).toBe(true);
  });
});

describe("composerBusyKey", () => {
  const idle = {
    checking: false,
    pendingPhase: null as "reading" | "receipt" | "voice" | null,
    askIntent: false,
    intent: null,
    dataReply: null,
    duplicateScan: null,
  };

  it("names the reading phase while checking", () => {
    expect(composerBusyKey({ ...idle, checking: true })).toBe("aiIntake.thinking.reading");
    expect(composerBusyKey({ ...idle, checking: true, pendingPhase: "receipt" })).toBe("aiIntake.thinking.receipt");
  });

  it("names a pending duplicate scan after checking ends", () => {
    expect(composerBusyKey({ ...idle, duplicateScan: { status: "pending" } })).toBe("aiIntake.thinking.duplicates");
  });

  it("names a loading data answer", () => {
    expect(composerBusyKey({ ...idle, intent: "ask_data" })).toBe("aiIntake.thinking.data");
  });

  it("is silent when nothing is in flight", () => {
    expect(composerBusyKey(idle)).toBeUndefined();
  });
});

describe("composerMode", () => {
  it("asks for an amount only when that clarification is open", () => {
    expect(composerMode("amount")).toBe("amount");
    expect(composerMode("type")).toBe("message");
    expect(composerMode(null)).toBe("message");
  });
});

describe("conversationStarted", () => {
  it("is true once there is history or an active turn", () => {
    expect(conversationStarted(0, null)).toBe(false);
    expect(conversationStarted(1, null)).toBe(true);
    expect(conversationStarted(0, { kind: "text", text: "שלום" })).toBe(true);
  });
});
