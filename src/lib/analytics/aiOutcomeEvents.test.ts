import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  trackAiTurnFailed,
  trackAiDraftCancelled,
  trackAiDraftCorrected,
  trackAiQuestionReasked,
  trackAiTurnStarted,
  mapErrorToFailureReason,
  normalizeQuestionText,
  compareQuestions,
} from "./aiOutcomeEvents";
import * as productAnalytics from "./productAnalytics";

vi.mock("./productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));

describe("aiOutcomeEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trackAiTurnFailed", () => {
    it("tracks ai_turn_failed with correct properties", () => {
      trackAiTurnFailed("text", "intent", "unavailable");
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_turn_failed", {
        input: "text",
        stage: "intent",
        reason: "unavailable",
      });
    });

    it("accepts all valid input kinds", () => {
      const inputs: Array<"text" | "voice" | "receipt"> = ["text", "voice", "receipt"];
      inputs.forEach((input) => {
        trackAiTurnFailed(input, "intent", "unknown");
        expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith(
          "ai_turn_failed",
          expect.objectContaining({ input }),
        );
      });
    });

    it("accepts all valid stages", () => {
      const stages: Array<"intent" | "split" | "receipt" | "speech" | "question"> = [
        "intent",
        "split",
        "receipt",
        "speech",
        "question",
      ];
      stages.forEach((stage) => {
        trackAiTurnFailed("text", stage, "unknown");
        expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith(
          "ai_turn_failed",
          expect.objectContaining({ stage }),
        );
      });
    });

    it("accepts all valid reasons", () => {
      const reasons: Array<
        "unavailable" | "unreadable" | "limit" | "timeout" | "no_amount" | "unknown"
      > = ["unavailable", "unreadable", "limit", "timeout", "no_amount", "unknown"];
      reasons.forEach((reason) => {
        trackAiTurnFailed("text", "intent", reason);
        expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith(
          "ai_turn_failed",
          expect.objectContaining({ reason }),
        );
      });
    });
  });

  describe("trackAiDraftCancelled", () => {
    it("tracks ai_draft_cancelled with correct properties", () => {
      trackAiDraftCancelled("text", "draft");
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_draft_cancelled", {
        input: "text",
        stage: "draft",
      });
    });

    it("accepts all valid stages", () => {
      const stages: Array<"draft" | "question" | "recording"> = ["draft", "question", "recording"];
      stages.forEach((stage) => {
        trackAiDraftCancelled("text", stage);
        expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith(
          "ai_draft_cancelled",
          expect.objectContaining({ stage }),
        );
      });
    });
  });

  describe("trackAiDraftCorrected", () => {
    it("tracks ai_draft_corrected with correct properties", () => {
      trackAiDraftCorrected("text", ["amount", "type"]);
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_draft_corrected", {
        input: "text",
        fields: ["amount", "type"],
      });
    });

    it("accepts all valid field names", () => {
      const fields: Array<
        "amount" | "type" | "date" | "category" | "payment_method" | "description" | "currency"
      > = ["amount", "type", "date", "category", "payment_method", "description", "currency"];
      trackAiDraftCorrected("text", fields);
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_draft_corrected", {
        input: "text",
        fields,
      });
    });

    it("accepts empty fields array", () => {
      trackAiDraftCorrected("text", []);
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_draft_corrected", {
        input: "text",
        fields: [],
      });
    });
  });

  describe("trackAiQuestionReasked", () => {
    it("tracks ai_question_reasked with correct properties", () => {
      trackAiQuestionReasked(60);
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_question_reasked", {
        within_seconds: 60,
      });
    });

    it("tracks ai_question_reasked with elapsed seconds", () => {
      trackAiQuestionReasked(12);
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_question_reasked", {
        within_seconds: 12,
      });
    });
  });

  describe("trackAiTurnStarted", () => {
    it("tracks ai_turn_started with input kind", () => {
      trackAiTurnStarted("text");
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_turn_started", {
        input: "text",
      });
    });

    it("tracks ai_turn_started with voice input", () => {
      trackAiTurnStarted("voice");
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_turn_started", {
        input: "voice",
      });
    });

    it("tracks ai_turn_started with receipt input", () => {
      trackAiTurnStarted("receipt");
      expect(productAnalytics.trackProductEvent).toHaveBeenCalledWith("ai_turn_started", {
        input: "receipt",
      });
    });
  });

  describe("mapErrorToFailureReason", () => {
    it("maps LIMIT to limit", () => {
      expect(mapErrorToFailureReason("LIMIT")).toBe("limit");
    });

    it("maps UNAVAILABLE to unavailable", () => {
      expect(mapErrorToFailureReason("UNAVAILABLE")).toBe("unavailable");
    });

    it("maps TOO_LARGE to unreadable", () => {
      expect(mapErrorToFailureReason("TOO_LARGE")).toBe("unreadable");
    });

    it("maps TOO_LONG to unreadable", () => {
      expect(mapErrorToFailureReason("TOO_LONG")).toBe("unreadable");
    });

    it("maps UNREADABLE to unreadable", () => {
      expect(mapErrorToFailureReason("UNREADABLE")).toBe("unreadable");
    });

    it("maps UNHEARD to unreadable", () => {
      expect(mapErrorToFailureReason("UNHEARD")).toBe("unreadable");
    });

    it("maps MIXED to unreadable", () => {
      expect(mapErrorToFailureReason("MIXED")).toBe("unreadable");
    });

    it("maps unknown errors to unknown", () => {
      expect(mapErrorToFailureReason("SOMETHING_ELSE")).toBe("unknown");
    });

    it("maps missing reason to unknown", () => {
      expect(mapErrorToFailureReason(undefined)).toBe("unknown");
    });
  });

  describe("normalizeQuestionText", () => {
    it("trims whitespace", () => {
      expect(normalizeQuestionText("  hello world  ")).toBe("hello world");
    });

    it("collapses multiple spaces", () => {
      expect(normalizeQuestionText("hello    world")).toBe("hello world");
    });

    it("converts to lowercase", () => {
      expect(normalizeQuestionText("Hello World")).toBe("hello world");
    });

    it("strips trailing punctuation", () => {
      expect(normalizeQuestionText("hello world?")).toBe("hello world");
      expect(normalizeQuestionText("hello world!")).toBe("hello world");
      expect(normalizeQuestionText("hello world.")).toBe("hello world");
      expect(normalizeQuestionText("hello world?!")).toBe("hello world");
    });

    it("combines all normalizations", () => {
      expect(normalizeQuestionText("  How Much  Did I Spend?!  ")).toBe("how much did i spend");
    });
  });

  describe("compareQuestions", () => {
    it("returns false when last is null", () => {
      const result = compareQuestions(
        { text: "hello", family: "", search: false },
        null,
        60000,
        Date.now(),
        null
      );
      expect(result).toBe(false);
    });

    it("returns false when timestampLast is null", () => {
      const result = compareQuestions(
        { text: "hello", family: "", search: false },
        { text: "hello", family: "", search: false },
        60000,
        Date.now(),
        null
      );
      expect(result).toBe(false);
    });

    it("returns false when time difference exceeds maxAgeMs", () => {
      const now = Date.now();
      const result = compareQuestions(
        { text: "hello", family: "", search: false },
        { text: "hello", family: "", search: false },
        60000,
        now,
        now - 61000
      );
      expect(result).toBe(false);
    });

    it("returns true for same normalized question within time window", () => {
      const now = Date.now();
      const result = compareQuestions(
        { text: "How much did I spend?", family: "", search: false },
        { text: "how much did i spend", family: "", search: false },
        60000,
        now,
        now - 30000
      );
      expect(result).toBe(true);
    });

    it("returns false for different questions", () => {
      const now = Date.now();
      const result = compareQuestions(
        { text: "How much did I spend?", family: "", search: false },
        { text: "How much did I earn?", family: "", search: false },
        60000,
        now,
        now - 30000
      );
      expect(result).toBe(false);
    });

    it("returns false for different family", () => {
      const now = Date.now();
      const result = compareQuestions(
        { text: "hello", family: "expense", search: false },
        { text: "hello", family: "income", search: false },
        60000,
        now,
        now - 30000
      );
      expect(result).toBe(false);
    });

    it("returns false for different search flag", () => {
      const now = Date.now();
      const result = compareQuestions(
        { text: "hello", family: "", search: true },
        { text: "hello", family: "", search: false },
        60000,
        now,
        now - 30000
      );
      expect(result).toBe(false);
    });

    it("returns true exactly at 60 seconds", () => {
      const now = Date.now();
      const result = compareQuestions(
        { text: "hello", family: "", search: false },
        { text: "hello", family: "", search: false },
        60000,
        now,
        now - 60000
      );
      expect(result).toBe(true);
    });

    it("returns false at 60001 milliseconds", () => {
      const now = Date.now();
      const result = compareQuestions(
        { text: "hello", family: "", search: false },
        { text: "hello", family: "", search: false },
        60000,
        now,
        now - 60001
      );
      expect(result).toBe(false);
    });
  });
});
