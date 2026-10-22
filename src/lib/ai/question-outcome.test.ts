import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { QUESTION_OUTCOME_WINDOW_MS, nextQuestionOutcome, type MeasurementHold } from "./question-outcome";

const hold: MeasurementHold = { id: "m-1", at: 1_000 };

describe("nextQuestionOutcome", () => {
  it("marks a family button and a description search", () => {
    expect(nextQuestionOutcome({ hold, now: 2_000, event: "family" }).mark?.outcome).toBe("asked_family");
    expect(nextQuestionOutcome({ hold, now: 2_000, event: "search" }).mark?.outcome).toBe("searched_description");
  });

  it("marks another question only inside the window", () => {
    expect(nextQuestionOutcome({ hold, now: hold.at + QUESTION_OUTCOME_WINDOW_MS, event: "ask" }).mark?.outcome)
      .toBe("asked_again");
    expect(nextQuestionOutcome({
      hold,
      now: hold.at + QUESTION_OUTCOME_WINDOW_MS + 1,
      event: "ask",
    }).mark).toBeNull();
  });

  it("marks an untouched numeric answer once the window ends", () => {
    const decision = nextQuestionOutcome({ hold, now: hold.at + QUESTION_OUTCOME_WINDOW_MS, event: "timeout" });
    expect(decision.mark).toEqual({ id: "m-1", outcome: "answered" });
    expect(decision.hold).toBeNull();
  });
});
