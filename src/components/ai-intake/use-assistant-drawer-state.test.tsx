/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAssistantDrawerState } from "./use-assistant-drawer-state";
import * as aiOutcomeEvents from "@/lib/analytics/aiOutcomeEvents";
import type { ReplyState } from "./assistant-reply-view";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));

vi.mock("@/lib/analytics/aiOutcomeEvents", () => ({
  trackAiDraftCancelled: vi.fn(),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: vi.fn(() => ({
    settings: {
      calendarType: "hebrew",
      defaultCurrency: "ILS",
      autoCalcChomesh: false,
    },
  })),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "he" },
  }),
}));

describe("useAssistantDrawerState - AI outcome events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ai_draft_cancelled tracking", () => {
    it("tracks draft cancellation on clearConversation with text input", () => {
      const { result } = renderHook(() => useAssistantDrawerState());

      result.current.conversationRef.current = {
        history: [],
        active: { kind: "text", text: "test" },
        reply: {
          draft: {
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
            amountInput: "100",
            appliedRuleName: null,
            duplicates: [],
            duplicatesRanked: false,
            locked: false,
          },
          savedItemId: null,
        } as unknown as ReplyState,
      };

      result.current.clearConversation();

      expect(aiOutcomeEvents.trackAiDraftCancelled).toHaveBeenCalledWith("text", "draft");
    });

    it("tracks draft cancellation with voice input", () => {
      const { result } = renderHook(() => useAssistantDrawerState());

      result.current.conversationRef.current = {
        history: [],
        active: { kind: "voice", text: "test" },
        reply: {
          draft: {
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
            amountInput: "100",
            appliedRuleName: null,
            duplicates: [],
            duplicatesRanked: false,
            locked: false,
          },
          savedItemId: null,
        } as unknown as ReplyState,
      };

      result.current.clearConversation();

      expect(aiOutcomeEvents.trackAiDraftCancelled).toHaveBeenCalledWith("voice", "draft");
    });

    it("tracks draft cancellation with receipt input", () => {
      const { result } = renderHook(() => useAssistantDrawerState());

      result.current.conversationRef.current = {
        history: [],
        active: { kind: "receipt", fileName: "test.jpg", mimeType: "image/jpeg", previewUrl: null },
        reply: {
          draft: {
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
            amountInput: "100",
            appliedRuleName: null,
            duplicates: [],
            duplicatesRanked: false,
            locked: false,
          },
          savedItemId: null,
        } as unknown as ReplyState,
      };

      result.current.clearConversation();

      expect(aiOutcomeEvents.trackAiDraftCancelled).toHaveBeenCalledWith("receipt", "draft");
    });

    it("does not track if draft was already saved", () => {
      const { result } = renderHook(() => useAssistantDrawerState());

      result.current.conversationRef.current = {
        history: [],
        active: { kind: "text", text: "test" },
        reply: {
          draft: {
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
            amountInput: "100",
            appliedRuleName: null,
            duplicates: [],
            duplicatesRanked: false,
            locked: false,
          },
          savedItemId: "saved-123",
        } as unknown as ReplyState,
      };

      result.current.clearConversation();

      expect(aiOutcomeEvents.trackAiDraftCancelled).not.toHaveBeenCalled();
    });

    it("does not track if no draft exists", () => {
      const { result } = renderHook(() => useAssistantDrawerState());

      result.current.conversationRef.current = {
        history: [],
        active: { kind: "text", text: "test" },
        reply: {
          draft: null,
          savedItemId: null,
        } as unknown as ReplyState,
      };

      result.current.clearConversation();

      expect(aiOutcomeEvents.trackAiDraftCancelled).not.toHaveBeenCalled();
    });
  });
});
