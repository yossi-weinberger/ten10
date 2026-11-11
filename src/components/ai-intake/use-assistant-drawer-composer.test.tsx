/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAssistantDrawerComposer } from "./use-assistant-drawer-composer";
import * as aiOutcomeEvents from "@/lib/analytics/aiOutcomeEvents";
import type { AssistantDrawerState } from "./use-assistant-drawer-state";
import type { AssistantDrawerIntent } from "./use-assistant-drawer-intent";

vi.mock("@/lib/analytics/aiOutcomeEvents", () => ({
  trackAiTurnFailed: vi.fn(),
  trackAiDraftCancelled: vi.fn(),
  mapErrorToFailureReason: vi.fn((_, reason) => {
    if (reason === "LIMIT") return "limit";
    if (reason === "UNAVAILABLE") return "unavailable";
    if (reason === "TOO_LARGE") return "unreadable";
    return "unknown";
  }),
}));

vi.mock("@/lib/ai/read-receipt", () => ({
  readReceiptImage: vi.fn(),
}));

vi.mock("@/lib/ai/transcribe-speech", () => ({
  transcribeSpeech: vi.fn(),
}));

describe("useAssistantDrawerComposer - AI outcome events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockState = (): Partial<AssistantDrawerState> => ({
    defaultCurrency: "ILS",
    questionCalendar: "hebrew",
    text: "",
    setText: vi.fn(),
    intent: null,
    receiptArtifactId: null,
    setReceiptArtifactId: vi.fn(),
    setReceiptLink: vi.fn(),
    setClarification: vi.fn(),
    held: { current: null },
    splitRef: { current: null },
    setPendingText: vi.fn(),
    setReceiptFields: vi.fn(),
    setParsedRule: vi.fn(),
    setRuleChoice: vi.fn(),
    setHalachaNamespace: vi.fn(),
    setHalachaUserQuestion: vi.fn(),
    setChecking: vi.fn(),
    setPendingPhase: vi.fn(),
    setElapsed: vi.fn(),
    recording: false,
    setRecording: vi.fn(),
    transcribing: false,
    setTranscribing: vi.fn(),
    setStatus: vi.fn(),
    askIntent: false,
    dataReply: null,
    duplicateScan: null,
    clarification: null,
    elapsed: 0,
    pendingPhase: null,
    checking: false,
    previewUrls: { current: [] },
    requestRef: { current: 0 },
    memoryRef: { current: { onScreen: null, history: [] } as any },
    turnStart: { current: { onScreen: null, history: [] } as any },
    contextRef: { current: "" },
    discardRecording: { current: false },
    recorder: { current: null },
    recordTimer: { current: null },
    mediaStream: { current: null },
    elapsedTimer: { current: null },
    showDraft: vi.fn(),
    beginTurn: vi.fn(),
    setIntent: vi.fn(),
    setLimitInfo: vi.fn(),
    setActiveUser: vi.fn(),
    conversationRef: { current: { history: [], active: null, reply: {} as any } },
  });

  const createMockIntent = (): Partial<AssistantDrawerIntent> => ({
    handleSubmit: vi.fn(),
    showIntent: vi.fn(),
    showHeld: vi.fn(),
  });

  describe("ai_turn_failed tracking", () => {
    it("tracks receipt failure with UNAVAILABLE", async () => {
      const { readReceiptImage } = await import("@/lib/ai/read-receipt");
      vi.mocked(readReceiptImage).mockResolvedValue({
        ok: false,
        reason: "UNAVAILABLE",
      } as any);

      const state = createMockState();
      const intent = createMockIntent();
      const { result } = renderHook(() =>
        useAssistantDrawerComposer(
          state as AssistantDrawerState,
          intent as Pick<AssistantDrawerIntent, "handleSubmit" | "showIntent" | "showHeld">,
        ),
      );

      const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
      await result.current.handleReceipt(file);

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiTurnFailed).toHaveBeenCalledWith(
          "receipt",
          "receipt",
          "unavailable",
        );
      });
    });

    it("tracks receipt failure with TOO_LARGE", async () => {
      const { readReceiptImage } = await import("@/lib/ai/read-receipt");
      vi.mocked(readReceiptImage).mockResolvedValue({
        ok: false,
        reason: "TOO_LARGE",
      } as any);

      const state = createMockState();
      const intent = createMockIntent();
      const { result } = renderHook(() =>
        useAssistantDrawerComposer(
          state as AssistantDrawerState,
          intent as Pick<AssistantDrawerIntent, "handleSubmit" | "showIntent" | "showHeld">,
        ),
      );

      const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
      await result.current.handleReceipt(file);

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiTurnFailed).toHaveBeenCalledWith(
          "receipt",
          "receipt",
          "unreadable",
        );
      });
    });

    it("tracks voice failure with UNAVAILABLE", async () => {
      const { transcribeSpeech } = await import("@/lib/ai/transcribe-speech");
      vi.mocked(transcribeSpeech).mockResolvedValue({
        ok: false,
        reason: "UNAVAILABLE",
      } as any);

      const state = createMockState();
      state.conversationRef = {
        current: { history: [], active: { kind: "voice", text: "" }, reply: {} as any },
      };
      const intent = createMockIntent();
      const { result } = renderHook(() =>
        useAssistantDrawerComposer(
          state as AssistantDrawerState,
          intent as Pick<AssistantDrawerIntent, "handleSubmit" | "showIntent" | "showHeld">,
        ),
      );

      const blob = new Blob(["audio"], { type: "audio/webm" });
      await result.current.finishVoice(blob);

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiTurnFailed).toHaveBeenCalledWith(
          "voice",
          "speech",
          "unavailable",
        );
      });
    });
  });

  describe("ai_draft_cancelled tracking", () => {
    it("tracks recording cancellation", () => {
      const state = createMockState();
      state.recording = true;
      state.recorder = {
        current: {
          state: "recording",
          stop: vi.fn(),
          stream: { getTracks: () => [{ stop: vi.fn() }] },
        } as any,
      };
      const intent = createMockIntent();
      const { result } = renderHook(() =>
        useAssistantDrawerComposer(
          state as AssistantDrawerState,
          intent as Pick<AssistantDrawerIntent, "handleSubmit" | "showIntent" | "showHeld">,
        ),
      );

      result.current.cancelRecording();

      expect(aiOutcomeEvents.trackAiDraftCancelled).toHaveBeenCalledWith("voice", "recording");
    });
  });
});
