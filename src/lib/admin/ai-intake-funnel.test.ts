import { describe, expect, it } from "vitest";
import { funnelStepPercents, intakeFunnel, shareOfCreated } from "./ai-intake-funnel";

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

describe("funnelStepPercents", () => {
  it("reports the share of the previous step and of the total", () => {
    expect(funnelStepPercents(20, 35, 50)).toEqual({ ofPrevious: 57, ofTotal: 40, bar: 40 });
  });

  it("stays at zero when the previous step is zero", () => {
    expect(funnelStepPercents(4, 0, 10)).toEqual({ ofPrevious: 0, ofTotal: 40, bar: 40 });
  });

  it("stays at zero when the total is zero", () => {
    const result = funnelStepPercents(0, 0, 0);
    expect(result).toEqual({ ofPrevious: 0, ofTotal: 0, bar: 0 });
    expect(Number.isNaN(result.ofPrevious)).toBe(false);
    expect(Number.isNaN(result.ofTotal)).toBe(false);
  });
});
