import { describe, expect, it } from "vitest";
import { getStepProgress } from "./stepProgress";

describe("getStepProgress", () => {
  it("fills the desktop line to the visible dots and the mobile bar by step count", () => {
    expect(getStepProgress("upload")).toMatchObject({ line: 0 });
    expect(getStepProgress("upload").bar).toBeCloseTo(33.33, 2);
    expect(getStepProgress("mapping")).toMatchObject({ line: 50 });
    expect(getStepProgress("mapping").bar).toBeCloseTo(66.67, 2);
    expect(getStepProgress("review")).toEqual({ line: 100, bar: 100 });
  });

  it("does not throw for the hidden result step", () => {
    expect(() => getStepProgress("result")).not.toThrow();
    const progress = getStepProgress("result");
    expect(progress.line).toBe(0);
    expect(progress.bar).toBeCloseTo(33.33, 2);
  });
});
