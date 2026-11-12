/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useAssistantDrawerIntent } from "./use-assistant-drawer-intent";
import { useAssistantDrawerState } from "./use-assistant-drawer-state";
import { trackAiTurnFailed, trackAiTurnStarted } from "@/lib/analytics/aiOutcomeEvents";

const ai = vi.hoisted(() => ({
  classifyIntentFallback: vi.fn(),
  splitItems: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));

vi.mock("@/lib/ai/intent-fallback", () => ({
  classifyIntentFallback: ai.classifyIntentFallback,
}));

vi.mock("@/lib/ai/split-items", () => ({
  splitItems: ai.splitItems,
}));

vi.mock("@/lib/ai/duplicate-candidates", () => ({
  listDuplicateCandidates: vi.fn(async () => []),
}));

vi.mock("@/lib/tableTransactions/tableTransactions.store", () => ({
  useTableTransactionsStore: { getState: () => ({ deleteTransaction: vi.fn() }) },
}));

vi.mock("@/lib/analytics/aiOutcomeEvents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics/aiOutcomeEvents")>();
  return {
    ...actual,
    trackAiTurnStarted: vi.fn(),
    trackAiTurnFailed: vi.fn(),
  };
});

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (selector: (state: {
    settings: { calendarType: string; defaultCurrency: string; autoCalcChomesh: boolean };
  }) => unknown) => selector({
    settings: {
      calendarType: "hebrew",
      defaultCurrency: "ILS",
      autoCalcChomesh: false,
    },
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "he", dir: () => "rtl" },
    }),
  };
});

const expenseSplit = {
  ok: true as const,
  route: "several" as const,
  items: [{
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
  }],
  found: 1,
  dropped: 0,
  rule: null,
  question: null,
  usageId: null,
};

const intentOk = {
  ok: true as const,
  intent: "add_transaction" as const,
  confidence: 0.95,
  halachaPage: null,
  halachaPageConfidence: null,
};

function useHarness() {
  const state = useAssistantDrawerState();
  const intent = useAssistantDrawerIntent(state);
  return { state, intent };
}

async function submit(
  result: { current: ReturnType<typeof useHarness> },
  spoken: string,
  kind: "text" | "voice" = "text",
  skipBeginTurn = false,
  skipTracking = false,
) {
  await act(async () => {
    await result.current.intent.handleSubmit(spoken, kind, skipBeginTurn, skipTracking);
  });
}

describe("useAssistantDrawerIntent handleSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ai.classifyIntentFallback.mockReset();
    ai.splitItems.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("(a) intent fails non-LIMIT and split succeeds: the turn shows the split draft and does not fire ai_turn_failed", async () => {
    ai.classifyIntentFallback.mockResolvedValue({ ok: false, reason: "UNAVAILABLE" });
    ai.splitItems.mockResolvedValue(expenseSplit);
    const { result } = renderHook(() => useHarness());

    await submit(result, "קניתי מאפים ב-15 שח");

    expect(ai.classifyIntentFallback).toHaveBeenCalledTimes(1);
    expect(ai.splitItems).toHaveBeenCalledTimes(1);
    expect(trackAiTurnStarted).toHaveBeenCalledTimes(1);
    expect(trackAiTurnStarted).toHaveBeenCalledWith("text");
    expect(trackAiTurnFailed).not.toHaveBeenCalled();
    expect(result.current.state.intent).toBe("add_transaction");
    expect(result.current.state.draft).toMatchObject({
      amount: 15,
      type: "expense",
      description: "מאפים",
    });
    expect(result.current.state.askIntent).toBe(false);
    expect(result.current.state.status).toBeNull();
  });

  it("(b) split fails non-LIMIT and intent succeeds: the turn proceeds and does not fire ai_turn_failed", async () => {
    ai.classifyIntentFallback.mockResolvedValue(intentOk);
    ai.splitItems.mockResolvedValue({ ok: false, reason: "UNAVAILABLE" });
    const { result } = renderHook(() => useHarness());

    await submit(result, "קניתי מאפים ב-15 שח");

    expect(ai.classifyIntentFallback).toHaveBeenCalledTimes(1);
    expect(ai.splitItems).toHaveBeenCalledTimes(1);
    expect(trackAiTurnFailed).not.toHaveBeenCalled();
    expect(result.current.state.intent).toBe("add_transaction");
    expect(result.current.state.status).toBe("couldNotRead");
    expect(result.current.state.draft).toBeNull();
  });

  it("(c) both fail non-LIMIT: exactly one ai_turn_failed with stage split", async () => {
    ai.classifyIntentFallback.mockResolvedValue({ ok: false, reason: "UNAVAILABLE" });
    ai.splitItems.mockResolvedValue({ ok: false, reason: "UNAVAILABLE" });
    const { result } = renderHook(() => useHarness());

    await submit(result, "קניתי מאפים ב-15 שח");

    expect(ai.classifyIntentFallback).toHaveBeenCalledTimes(1);
    expect(ai.splitItems).toHaveBeenCalledTimes(1);
    expect(trackAiTurnFailed).toHaveBeenCalledTimes(1);
    expect(trackAiTurnFailed).toHaveBeenCalledWith("text", "split", "unavailable");
    expect(result.current.state.askIntent).toBe(true);
    expect(result.current.state.intent).toBeNull();
    expect(result.current.state.draft).toBeNull();
  });

  it("(d) intent LIMIT fires one limit failure and stops before a draft", async () => {
    ai.classifyIntentFallback.mockResolvedValue({
      ok: false,
      reason: "LIMIT",
      limit: { kind: "daily_limit", resetsAt: null },
    });
    ai.splitItems.mockResolvedValue(expenseSplit);
    const { result } = renderHook(() => useHarness());

    await submit(result, "קניתי מאפים ב-15 שח");

    expect(ai.classifyIntentFallback).toHaveBeenCalledTimes(1);
    expect(ai.splitItems).toHaveBeenCalledTimes(1);
    expect(trackAiTurnFailed).toHaveBeenCalledTimes(1);
    expect(trackAiTurnFailed).toHaveBeenCalledWith("text", "intent", "limit");
    expect(result.current.state.status).toBe("limitDailyLimit");
    expect(result.current.state.limitInfo).toEqual({ kind: "daily_limit", resetsAt: null });
    expect(result.current.state.intent).toBeNull();
    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.askIntent).toBe(false);
  });

  it("(d) split LIMIT fires one limit failure and stops before the intent outcome", async () => {
    ai.classifyIntentFallback.mockResolvedValue(intentOk);
    ai.splitItems.mockResolvedValue({
      ok: false,
      reason: "LIMIT",
      limit: { kind: "quota_exhausted", resetsAt: "2026-12-01T00:00:00Z" },
    });
    const { result } = renderHook(() => useHarness());

    await submit(result, "קניתי מאפים ב-15 שח");

    expect(trackAiTurnFailed).toHaveBeenCalledTimes(1);
    expect(trackAiTurnFailed).toHaveBeenCalledWith("text", "split", "limit");
    expect(result.current.state.status).toBe("limitQuotaExhausted");
    expect(result.current.state.limitInfo).toEqual({
      kind: "quota_exhausted",
      resetsAt: "2026-12-01T00:00:00Z",
    });
    expect(result.current.state.intent).toBeNull();
    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.askIntent).toBe(false);
  });

  it("(e) ai_turn_started fires once for text and once for voice, and skipTracking does not fire again", async () => {
    ai.classifyIntentFallback.mockResolvedValue(intentOk);
    ai.splitItems.mockResolvedValue(expenseSplit);
    const { result } = renderHook(() => useHarness());

    await submit(result, "קניתי מאפים", "text");
    expect(trackAiTurnStarted).toHaveBeenCalledTimes(1);
    expect(trackAiTurnStarted).toHaveBeenCalledWith("text");

    vi.mocked(trackAiTurnStarted).mockClear();
    await submit(result, "קניתי מאפים", "voice");
    expect(trackAiTurnStarted).toHaveBeenCalledTimes(1);
    expect(trackAiTurnStarted).toHaveBeenCalledWith("voice");

    vi.mocked(trackAiTurnStarted).mockClear();
    await submit(result, "קניתי מאפים", "voice", true, true);
    expect(trackAiTurnStarted).not.toHaveBeenCalled();
  });

  it("stays silent when intent returns BETA_CONSENT", async () => {
    ai.classifyIntentFallback.mockResolvedValue({ ok: false, reason: "BETA_CONSENT" });
    ai.splitItems.mockResolvedValue(expenseSplit);
    const { result } = renderHook(() => useHarness());

    await submit(result, "קניתי מאפים ב-15 שח");

    expect(trackAiTurnStarted).toHaveBeenCalledWith("text");
    expect(trackAiTurnFailed).not.toHaveBeenCalled();
    expect(result.current.state.status).toBeNull();
    expect(result.current.state.intent).toBeNull();
    expect(result.current.state.askIntent).toBe(false);
    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.limitInfo).toBeNull();
  });

  it("stays silent when split returns BETA_CONSENT", async () => {
    ai.classifyIntentFallback.mockResolvedValue(intentOk);
    ai.splitItems.mockResolvedValue({ ok: false, reason: "BETA_CONSENT" });
    const { result } = renderHook(() => useHarness());

    await submit(result, "קניתי מאפים ב-15 שח");

    expect(trackAiTurnFailed).not.toHaveBeenCalled();
    expect(result.current.state.status).toBeNull();
    expect(result.current.state.intent).toBeNull();
    expect(result.current.state.askIntent).toBe(false);
    expect(result.current.state.draft).toBeNull();
    expect(result.current.state.limitInfo).toBeNull();
  });
});
