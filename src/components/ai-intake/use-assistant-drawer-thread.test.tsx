/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAssistantDrawerThread } from "./use-assistant-drawer-thread";
import * as aiOutcomeEvents from "@/lib/analytics/aiOutcomeEvents";
import type { AssistantDrawerState } from "./use-assistant-drawer-state";
import type { AssistantDrawerIntent } from "./use-assistant-drawer-intent";
import type { AssistantDrawerComposer } from "./use-assistant-drawer-composer";

vi.mock("@/lib/analytics/aiOutcomeEvents", () => ({
  trackAiDraftCorrected: vi.fn(),
}));

vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));

vi.mock("@/lib/ai/save-text-draft", () => ({
  saveTextDraft: vi.fn(),
  nextDraftIdempotency: vi.fn((current) => current || { key: "test-key" }),
}));

vi.mock("@/lib/ai/undo-text-intake", () => ({
  undoTextIntake: vi.fn(),
}));

vi.mock("@/lib/ai/refresh-after-intake", () => ({
  refreshAfterIntakeSave: vi.fn(),
}));

describe("useAssistantDrawerThread - AI outcome events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockState = (): Partial<AssistantDrawerState> => ({
    autoCalcChomesh: false,
    questionCalendar: "hebrew",
    draft: {
      type: "expense",
      amount: 100,
      currency: "ILS",
      date: "2024-01-15",
      description: "test",
      category: null,
      paymentMethod: null,
      recipient: null,
      isChomesh: false,
    },
    setDraft: vi.fn(),
    recurring: null,
    setRecurring: vi.fn(),
    idempotency: { current: { key: "test-key", source: {} as any } },
    splitKey: { current: null },
    splitAttempt: { current: 0 },
    splitDuplicateWarned: { current: null },
    originalDraft: { current: { description: "test", amount: 100, date: "2024-01-15" } },
    savedRecurring: { current: null },
    receiptArtifactId: null,
    amountInput: "100",
    setAmountInput: vi.fn(),
    duplicates: [],
    setParsedRule: vi.fn(),
    setRuleChoice: vi.fn(),
    saving: false,
    setSaving: vi.fn(),
    undoing: false,
    setUndoing: vi.fn(),
    savedItemId: "saved-123",
    setSavedItemId: vi.fn(),
    setStatus: vi.fn(),
    splitDrafts: null,
    setSplitDrafts: vi.fn(),
    intentConfidence: 0.9,
    setConfirmDeleteId: vi.fn(),
    requestRef: { current: 1 },
    memoryRef: { current: { onScreen: null, history: [] } as any },
    refreshDuplicates: vi.fn(),
    replyState: vi.fn(() => ({} as any)),
    history: [],
    activeUser: null,
    recurringSaveId: { current: null },
    savedTransaction: { current: null },
    replacing: { current: { itemId: "old-123", transactionId: "old-tx-123" } },
  });

  const createMockIntent = (): Partial<AssistantDrawerIntent> => ({
    handleChooseIntent: vi.fn(),
    handleChooseType: vi.fn(),
    handleChooseSpecial: vi.fn(),
    loadDataAnswer: vi.fn(),
    answerWithName: vi.fn(),
    answerWithoutName: vi.fn(),
    askDelete: vi.fn(),
    confirmDelete: vi.fn(),
    dismissPair: vi.fn(),
  });

  const createMockComposer = (): Partial<AssistantDrawerComposer> => ({
    openReceiptFile: vi.fn(),
  });

  describe("ai_draft_corrected tracking", () => {
    it("tracks correction when saving with replacing.current", async () => {
      const { undoTextIntake } = await import("@/lib/ai/undo-text-intake");
      const { saveTextDraft } = await import("@/lib/ai/save-text-draft");

      vi.mocked(undoTextIntake).mockResolvedValue({ ok: true });
      vi.mocked(saveTextDraft).mockResolvedValue({
        ok: true,
        itemId: "new-123",
        transactionId: "new-tx-123",
        sameEvent: false,
      } as any);

      const state = createMockState();
      state.originalDraft = {
        current: { description: "original", amount: 50, date: "2024-01-10" },
      };
      state.draft = {
        type: "expense",
        amount: 100,
        currency: "ILS",
        date: "2024-01-15",
        description: "test",
        category: null,
        paymentMethod: null,
        recipient: null,
        isChomesh: false,
      };
      state.amountInput = "100";

      const intent = createMockIntent();
      const composer = createMockComposer();
      const { result } = renderHook(() =>
        useAssistantDrawerThread(
          state as AssistantDrawerState,
          intent as AssistantDrawerIntent,
          composer as Pick<AssistantDrawerComposer, "openReceiptFile">,
        ),
      );

      await result.current.handleSave();

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiDraftCorrected).toHaveBeenCalledWith("text", [
          "amount",
          "description",
          "date",
        ]);
      });
    });

    it("tracks type change on saved item", async () => {
      const { undoTextIntake } = await import("@/lib/ai/undo-text-intake");
      const { saveTextDraft } = await import("@/lib/ai/save-text-draft");

      vi.mocked(undoTextIntake).mockResolvedValue({ ok: true });
      vi.mocked(saveTextDraft).mockResolvedValue({
        ok: true,
        itemId: "new-123",
        transactionId: "new-tx-123",
        sameEvent: false,
      } as any);

      const state = createMockState();
      state.draft = {
        type: "expense",
        amount: 100,
        currency: "ILS",
        date: "2024-01-15",
        description: "test",
        category: null,
        paymentMethod: null,
        recipient: null,
        isChomesh: false,
      };
      state.savedItemId = "saved-123";

      const intent = createMockIntent();
      const composer = createMockComposer();
      const { result } = renderHook(() =>
        useAssistantDrawerThread(
          state as AssistantDrawerState,
          intent as AssistantDrawerIntent,
          composer as Pick<AssistantDrawerComposer, "openReceiptFile">,
        ),
      );

      await result.current.handleTypeChange("donation");

      await waitFor(() => {
        expect(aiOutcomeEvents.trackAiDraftCorrected).toHaveBeenCalledWith("text", ["type"]);
      });
    });
  });
});
