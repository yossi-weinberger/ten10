/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAssistantDrawerIntent } from "./use-assistant-drawer-intent";
import * as aiOutcomeEvents from "@/lib/analytics/aiOutcomeEvents";
import type { AssistantDrawerState } from "./use-assistant-drawer-state";

vi.mock("@/lib/analytics/aiOutcomeEvents", () => ({
  trackAiTurnFailed: vi.fn(),
  trackAiQuestionReasked: vi.fn(),
  mapErrorToFailureReason: vi.fn((_, reason) => {
    if (reason === "LIMIT") return "limit";
    if (reason === "UNAVAILABLE") return "unavailable";
    return "unknown";
  }),
}));

vi.mock("@/lib/ai/classify-intake", async () => ({
  ...(await vi.importActual<typeof import("@/lib/ai/classify-intake")>("@/lib/ai/classify-intake")),
  classifyIntentFallback: vi.fn(),
}));

vi.mock("@/lib/ai/split-items", () => ({
  splitItems: vi.fn(),
}));

vi.mock("@/lib/ai/sum-year-type", () => ({
  sumYearType: vi.fn(),
  resolveQuestionFilter: vi.fn(),
}));

vi.mock("@/lib/ai/read-question", () => ({
  readQuestionSlots: vi.fn(),
}));

describe("useAssistantDrawerIntent - AI outcome events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockState = (): Partial<AssistantDrawerState> => ({
    user: null,
    i18n: { language: "he" } as any,
    defaultCurrency: "ILS",
    autoCalcChomesh: false,
    questionCalendar: "hebrew",
    setIntent: vi.fn(),
    setInspiration: vi.fn(),
    setRecurring: vi.fn(),
    splitKey: { current: null },
    splitAttempt: { current: 0 },
    splitDuplicateWarned: { current: null },
    savedRecurring: { current: null },
    setReceiptArtifactId: vi.fn(),
    setClarification: vi.fn(),
    setSpecialType: vi.fn(),
    held: { current: null },
    splitRef: { current: null },
    halachaRef: { current: null },
    preferRabbi: { current: false },
    setPendingText: vi.fn(),
    setReceiptFields: vi.fn(),
    setParsedRule: vi.fn(),
    setRuleChoice: vi.fn(),
    setHalachaNamespace: vi.fn(),
    setHalachaUserQuestion: vi.fn(),
    setRabbiText: vi.fn(),
    setRabbiTicket: vi.fn(),
    setChecking: vi.fn(),
    setPendingPhase: vi.fn(),
    setSavedItemId: vi.fn(),
    setStatus: vi.fn(),
    setSplitDrafts: vi.fn(),
    setSplitDropped: vi.fn(),
    setAskIntent: vi.fn(),
    setIntentConfidence: vi.fn(),
    setDataReply: vi.fn(),
    slotHold: null,
    setSlotHold: vi.fn(),
    periodHold: { current: null },
    nameHold: { current: null },
    askedQuestion: null,
    setAskedQuestion: vi.fn(),
    setConfirmDeleteId: vi.fn(),
    setDuplicateActionFailed: vi.fn(),
    setDuplicateScan: vi.fn(),
    requestRef: { current: 0 },
    memoryRef: { current: { onScreen: null, history: [] } as any },
    turnStart: { current: { onScreen: null, history: [] } as any },
    contextRef: { current: "" },
    followQuestion: vi.fn(),
    holdMeasurement: vi.fn(),
    armAnswered: vi.fn(),
    showDraft: vi.fn(),
    beginTurn: vi.fn(),
    savedTransaction: { current: null },
    replacing: { current: null },
    pairActionBusy: { current: false },
    setText: vi.fn(),
    text: "",
    setLimitInfo: vi.fn(),
  });

  describe("ai_turn_failed tracking", () => {
    it("tracks intent failure with LIMIT", async () => {
      const { classifyIntentFallback } = await import("@/lib/ai/classify-intake");
      const { splitItems } = await import("@/lib/ai/split-items");
      vi.mocked(classifyIntentFallback).mockResolvedValue({
        ok: false,
        reason: "LIMIT",
        limit: { kind: "daily_limit", remaining: 0, reset_at: new Date().toISOString() },
      } as any);
      vi.mocked(splitItems).mockResolvedValue({ ok: true, route: "none" } as any);

      const state = createMockState();
      const { result } = renderHook(() => useAssistantDrawerIntent(state as AssistantDrawerState));

      await result.current.handleSubmit("test message", "text");

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiTurnFailed).toHaveBeenCalledWith("text", "intent", "limit");
      });
    });

    it("tracks split failure with LIMIT", async () => {
      const { classifyIntentFallback } = await import("@/lib/ai/classify-intake");
      const { splitItems } = await import("@/lib/ai/split-items");
      vi.mocked(classifyIntentFallback).mockResolvedValue({
        ok: true,
        intent: "add_transaction",
        confidence: 0.9,
      } as any);
      vi.mocked(splitItems).mockResolvedValue({
        ok: false,
        reason: "LIMIT",
        limit: { kind: "rate_limited", remaining: 0, reset_at: new Date().toISOString() },
      } as any);

      const state = createMockState();
      const { result } = renderHook(() => useAssistantDrawerIntent(state as AssistantDrawerState));

      await result.current.handleSubmit("test message", "text");

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiTurnFailed).toHaveBeenCalledWith("text", "split", "limit");
      });
    });

    it("tracks question failure", async () => {
      const { sumYearType } = await import("@/lib/ai/sum-year-type");
      vi.mocked(sumYearType).mockResolvedValue({ ok: false, reason: "MIXED" } as any);

      const state = createMockState();
      state.requestRef = { current: 1 };
      const { result } = renderHook(() => useAssistantDrawerIntent(state as AssistantDrawerState));

      await result.current.showFiltered(
        {
          year: 2024,
          month: null,
          measure: "sum",
          type: "expense",
          paymentMethod: null,
          recipient: null,
          topic: null,
          from: "2024-01-01",
          to: "2024-12-31",
        } as any,
        {},
        1,
      );

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiTurnFailed).toHaveBeenCalledWith(
          "text",
          "question",
          "unreadable",
        );
      });
    });
  });

  describe("ai_question_reasked tracking", () => {
    it("tracks when same question is asked within 60 seconds", async () => {
      const { readQuestionSlots } = await import("@/lib/ai/read-question");
      const { resolveQuestionFilter } = await import("@/lib/ai/sum-year-type");
      const { sumYearType } = await import("@/lib/ai/sum-year-type");

      vi.mocked(readQuestionSlots).mockResolvedValue({
        family: "expense",
        measure: "sum",
        recipient: null,
        category: null,
        paymentMethod: null,
        period: { kind: "all" },
        nameText: null,
        subject: null,
      } as any);

      vi.mocked(resolveQuestionFilter).mockResolvedValue({});
      vi.mocked(sumYearType).mockResolvedValue({
        ok: true,
        total: 100,
        count: 5,
        currency: "ILS",
      } as any);

      const state = createMockState();
      state.requestRef = { current: 1 };
      const { result } = renderHook(() => useAssistantDrawerIntent(state as AssistantDrawerState));

      await result.current.loadDataAnswer("how much did I spend?");

      vi.clearAllMocks();

      await result.current.loadDataAnswer("how much did I spend?");

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiQuestionReasked).toHaveBeenCalledWith(60);
      });
    });
  });
});
