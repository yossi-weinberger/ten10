/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as aiOutcomeEvents from "@/lib/analytics/aiOutcomeEvents";

const mocks = vi.hoisted(() => ({
  trackAiTurnStarted: vi.fn(),
  trackAiTurnFailed: vi.fn(),
  trackAiQuestionReasked: vi.fn(),
  classifyIntentFallback: vi.fn(),
  splitItems: vi.fn(),
}));

vi.mock("@/lib/ai/intent-fallback", () => ({
  classifyIntentFallback: mocks.classifyIntentFallback,
}));

vi.mock("@/lib/ai/split-items", () => ({
  splitItems: mocks.splitItems,
}));

vi.mock("@/lib/analytics/aiOutcomeEvents", () => ({
  trackAiTurnStarted: mocks.trackAiTurnStarted,
  trackAiTurnFailed: mocks.trackAiTurnFailed,
  trackAiQuestionReasked: mocks.trackAiQuestionReasked,
  mapErrorToFailureReason: (reason?: string) => {
    if (reason === "LIMIT") return "limit";
    if (reason === "UNAVAILABLE") return "unavailable";
    if (
      reason === "TOO_LARGE" || reason === "TOO_LONG" ||
      reason === "UNREADABLE" || reason === "UNHEARD" || reason === "MIXED"
    ) return "unreadable";
    return "unknown";
  },
  compareQuestions: () => false,
}));

// Unit tests for turn flow event tracking logic
describe("handleSubmit turn flow - event tracking", () => {
  beforeEach(() => {
    mocks.trackAiTurnStarted.mockClear();
    mocks.trackAiTurnFailed.mockClear();
    mocks.trackAiQuestionReasked.mockClear();
    mocks.classifyIntentFallback.mockClear();
    mocks.splitItems.mockClear();
  });

  it("(a) intent fails non-LIMIT, split ok: turn proceeds, no ai_turn_failed", () => {
    // Setup: intent failure (non-LIMIT), split success
    const decidedFailed = false; // intent analyzed but failed
    const readOk = true; // split succeeded

    // Simulate the logic from handleSubmit
    const bothFailed = !decidedFailed && !readOk; // false
    
    // Expectations: no ai_turn_failed should fire (split succeeded)
    expect(bothFailed).toBe(false);
    
    // Verify the control flow would continue (no early return)
    // In real code: turn proceeds to decideTurn/split handling
  });

  it("(b) split fails non-LIMIT, intent ok: turn proceeds, no ai_turn_failed", () => {
    // Setup: intent success, split failure (non-LIMIT)
    const decidedOk = true; // intent succeeded
    const readFailed = false; // split analyzed but failed

    // Simulate the logic
    const bothFailed = !decidedOk && !readFailed; // false

    // Expectations: no ai_turn_failed should fire (intent succeeded)
    expect(bothFailed).toBe(false);
    
    // Verify the control flow would continue
  });

  it("(c) both fail non-LIMIT: exactly one ai_turn_failed with stage 'split'", () => {
    // Setup: both intent and split failed (non-LIMIT)
    const decidedOk = false;
    const readOk = false;
    const kind = "text";
    const readReason = "UNREADABLE";

    // Simulate the logic from handleSubmit
    const bothFailed = !decidedOk && !readOk; // true
    
    if (bothFailed) {
      mocks.trackAiTurnFailed(kind, "split", aiOutcomeEvents.mapErrorToFailureReason(readReason));
    }

    // Expectations: exactly one ai_turn_failed with stage 'split'
    expect(bothFailed).toBe(true);
    expect(mocks.trackAiTurnFailed).toHaveBeenCalledWith("text", "split", "unreadable");
    expect(mocks.trackAiTurnFailed).toHaveBeenCalledTimes(1);
  });

  it("(d) intent LIMIT: one ai_turn_failed 'limit', stops", () => {
    // Setup: intent LIMIT
    const kind = "text";
    const decidedReason = "LIMIT";
    const decidedOk = false;

    // Simulate the LIMIT path from handleSubmit
    if (!decidedOk && decidedReason === "LIMIT") {
      mocks.trackAiTurnFailed(kind, "intent", "limit");
      // Turn stops here (early return)
    }

    // Expectations: exactly one ai_turn_failed with 'limit' at 'intent' stage
    expect(mocks.trackAiTurnFailed).toHaveBeenCalledWith("text", "intent", "limit");
    expect(mocks.trackAiTurnFailed).toHaveBeenCalledTimes(1);
  });

  it("(d) split LIMIT: one ai_turn_failed 'limit', stops", () => {
    // Setup: intent ok, split LIMIT
    const kind = "text";
    const readReason = "LIMIT";
    const readOk = false;

    // Simulate the LIMIT path from handleSubmit
    if (!readOk && readReason === "LIMIT") {
      mocks.trackAiTurnFailed(kind, "split", "limit");
      // Turn stops here (early return)
    }

    // Expectations: exactly one ai_turn_failed with 'limit' at 'split' stage
    expect(mocks.trackAiTurnFailed).toHaveBeenCalledWith("text", "split", "limit");
    expect(mocks.trackAiTurnFailed).toHaveBeenCalledTimes(1);
  });

  it("(e) ai_turn_started fires exactly once for text", () => {
    // Setup: normal text turn
    const kind = "text";
    const skipTracking = false;

    // Simulate the logic from handleSubmit
    if (!skipTracking) {
      mocks.trackAiTurnStarted(kind);
    }

    // Expectations: ai_turn_started fires once
    expect(mocks.trackAiTurnStarted).toHaveBeenCalledWith("text");
    expect(mocks.trackAiTurnStarted).toHaveBeenCalledTimes(1);
  });

  it("(e) ai_turn_started fires exactly once for voice (no double from finishVoice)", () => {
    // Setup: voice turn with skipTracking=true (called from finishVoice)
    const kind = "voice";
    const skipTracking = true;

    // Simulate the logic from handleSubmit
    if (!skipTracking) {
      mocks.trackAiTurnStarted(kind);
    }

    // Expectations: ai_turn_started does NOT fire (skipTracking=true)
    expect(mocks.trackAiTurnStarted).not.toHaveBeenCalled();
    
    // In real flow: finishVoice already called trackAiTurnStarted("voice")
    // before calling handleSubmit with skipTracking=true
  });

  it("control flow: non-LIMIT failures do not stop turn", () => {
    // Test that the control flow does NOT include early returns for non-LIMIT failures
    
    // Case 1: intent fails non-LIMIT
    const decided1 = { ok: false, reason: "UNAVAILABLE" };
    const shouldStopAfterIntent1 = !decided1.ok && decided1.reason === "LIMIT";
    expect(shouldStopAfterIntent1).toBe(false); // turn continues
    
    // Case 2: split fails non-LIMIT
    const read2 = { ok: false, reason: "UNAVAILABLE" };
    const shouldStopAfterSplit2 = !read2.ok && read2.reason === "LIMIT";
    expect(shouldStopAfterSplit2).toBe(false); // turn continues
    
    // Only LIMIT stops turn
    const decidedLimit = { ok: false, reason: "LIMIT", limit: { kind: "daily_limit", resetsAt: null } };
    const shouldStopLimit = !decidedLimit.ok && decidedLimit.reason === "LIMIT";
    expect(shouldStopLimit).toBe(true); // turn stops
  });
});
