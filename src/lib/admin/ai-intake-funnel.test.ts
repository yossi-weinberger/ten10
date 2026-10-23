import { describe, expect, it } from "vitest";
import { intakeFunnel, shareOfCreated } from "./ai-intake-funnel";

describe("intakeFunnel", () => {
  it("keeps created equal to open plus rejected plus saved", () => {
    const funnel = intakeFunnel(
      { ready: 10, needs_review: 3, approved: 1, rejected: 1, committed: 20, reverted: 15 },
      { ai: 14, ai_auto: 0 },
    );
    expect(funnel.created).toBe(funnel.open + funnel.rejected + funnel.saved);
    expect(funnel).toEqual({
      created: 50,
      open: 14,
      rejected: 1,
      saved: 35,
      undone: 15,
      kept: 20,
      existing: 14,
      auto: 0,
    });
    expect(shareOfCreated(funnel.kept, funnel.created)).toBe(40);
  });
});
