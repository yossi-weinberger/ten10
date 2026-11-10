import { describe, expect, it } from "vitest";
import { amountReplySource, composerWiring } from "./assistant-drawer-composer";

describe("amountReplySource", () => {
  it("joins the pending request and the typed amount", () => {
    expect(amountReplySource("קניתי לחם", "15")).toBe("קניתי לחם 15");
    expect(amountReplySource("", "15")).toBe("15");
    expect(amountReplySource("  קניתי לחם", "15")).toBe("קניתי לחם 15");
  });
});

describe("composerWiring", () => {
  const idle = {
    text: "שלום",
    checking: false,
    pendingPhase: null,
    askIntent: false,
    intent: null,
    dataReply: null,
    duplicateScan: null,
    clarification: null,
    recording: false,
    transcribing: false,
    elapsed: 0,
  } as const;

  it("keeps the typed text and the message mode", () => {
    expect(composerWiring(idle)).toEqual({
      value: "שלום",
      busyKey: undefined,
      recording: false,
      transcribing: false,
      elapsed: 0,
      mode: "message",
    });
  });

  it("switches to amount mode and names a busy receipt read", () => {
    expect(composerWiring({
      ...idle,
      checking: true,
      pendingPhase: "receipt",
      clarification: "amount",
      recording: true,
      elapsed: 3,
    })).toEqual({
      value: "שלום",
      busyKey: "aiIntake.thinking.receipt",
      recording: true,
      transcribing: false,
      elapsed: 3,
      mode: "amount",
    });
  });
});
