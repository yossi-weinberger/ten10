import { describe, expect, it } from "vitest";
import { getBrandProgressParts } from "./brandProgress.utils";

describe("getBrandProgressParts", () => {
  it("starts empty", () => {
    expect(getBrandProgressParts(0)).toEqual({ ring: 0, slice: 0 });
  });

  it("fills the ring over the first 90%", () => {
    expect(getBrandProgressParts(45)).toEqual({ ring: 0.5, slice: 0 });
    expect(getBrandProgressParts(90)).toEqual({ ring: 1, slice: 0 });
  });

  it("drops the slice in over the last 10%", () => {
    const parts = getBrandProgressParts(95);
    expect(parts.ring).toBe(1);
    expect(parts.slice).toBeCloseTo(0.5);
    expect(getBrandProgressParts(100)).toEqual({ ring: 1, slice: 1 });
  });

  it("clamps out-of-range and invalid values", () => {
    expect(getBrandProgressParts(-20)).toEqual({ ring: 0, slice: 0 });
    expect(getBrandProgressParts(250)).toEqual({ ring: 1, slice: 1 });
    expect(getBrandProgressParts(Number.NaN)).toEqual({ ring: 0, slice: 0 });
  });
});
