/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useAssistantDrawerComposer } from "./use-assistant-drawer-composer";
import { useAssistantDrawerState } from "./use-assistant-drawer-state";
import type { AssistantDrawerIntent } from "./use-assistant-drawer-intent";
import { trackAiTurnFailed, trackAiTurnStarted } from "@/lib/analytics/aiOutcomeEvents";

const ai = vi.hoisted(() => ({
  readReceiptImage: vi.fn(),
  transcribeSpeech: vi.fn(),
  splitItems: vi.fn(),
  showIntent: vi.fn(),
  showHeld: vi.fn(),
  handleSubmit: vi.fn(),
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));

vi.mock("@/lib/ai/read-receipt", () => ({
  readReceiptImage: ai.readReceiptImage,
}));

vi.mock("@/lib/ai/open-receipt", () => ({
  openAiReceipt: vi.fn(),
}));

vi.mock("@/lib/ai/transcribe-speech", () => ({
  transcribeSpeech: ai.transcribeSpeech,
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
    trackAiDraftCancelled: vi.fn(),
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

function useHarness() {
  const state = useAssistantDrawerState();
  const intent: Pick<AssistantDrawerIntent, "handleSubmit" | "showIntent" | "showHeld"> = {
    handleSubmit: ai.handleSubmit,
    showIntent: ai.showIntent,
    showHeld: ai.showHeld,
  };
  const composer = useAssistantDrawerComposer(state, intent);
  return { state, composer };
}

describe("silent BETA_CONSENT in the assistant composer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ai.readReceiptImage.mockReset();
    ai.transcribeSpeech.mockReset();
    ai.splitItems.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("does not set a failure status or fire ai_turn_failed when a receipt needs consent", async () => {
    ai.readReceiptImage.mockResolvedValue({ ok: false, reason: "BETA_CONSENT" });
    const { result } = renderHook(() => useHarness());
    const file = new File(["receipt"], "receipt.pdf", { type: "application/pdf" });

    await act(async () => {
      await result.current.composer.handleReceipt(file);
    });

    expect(trackAiTurnStarted).toHaveBeenCalledWith("receipt");
    expect(trackAiTurnFailed).not.toHaveBeenCalled();
    expect(result.current.state.status).toBeNull();
    expect(result.current.state.checking).toBe(false);
    expect(result.current.state.intent).toBeNull();
    expect(result.current.state.draft).toBeNull();
  });

  it("does not set a failure status or fire ai_turn_failed when speech needs consent", async () => {
    ai.transcribeSpeech.mockResolvedValue({ ok: false, reason: "BETA_CONSENT" });
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      await result.current.composer.finishVoice(new Blob(["audio"], { type: "audio/webm" }));
    });

    expect(trackAiTurnStarted).toHaveBeenCalledWith("voice");
    expect(trackAiTurnFailed).not.toHaveBeenCalled();
    expect(ai.handleSubmit).not.toHaveBeenCalled();
    expect(result.current.state.status).toBeNull();
    expect(result.current.state.checking).toBe(false);
    expect(result.current.state.transcribing).toBe(false);
    expect(result.current.state.limitInfo).toBeNull();
  });

  it("does not continue the amount reply or fire ai_turn_failed when the split needs consent", async () => {
    ai.splitItems.mockResolvedValue({ ok: false, reason: "BETA_CONSENT" });
    const { result } = renderHook(() => useHarness());

    await act(async () => {
      result.current.composer.handleAmountReply("מאפים");
      await Promise.resolve();
    });

    expect(ai.splitItems).toHaveBeenCalledTimes(1);
    expect(ai.showIntent).not.toHaveBeenCalled();
    expect(trackAiTurnFailed).not.toHaveBeenCalled();
    expect(result.current.state.status).toBeNull();
    expect(result.current.state.checking).toBe(false);
  });
});
