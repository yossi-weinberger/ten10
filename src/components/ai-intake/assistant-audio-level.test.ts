import { describe, expect, it } from "vitest";
import { levelFromSamples } from "./assistant-audio-level";

describe("levelFromSamples", () => {
  it("is silent at the midpoint and full when every sample is at an extreme", () => {
    expect(levelFromSamples(new Uint8Array())).toBe(0);
    expect(levelFromSamples(new Uint8Array([128, 128, 128]))).toBe(0);
    expect(levelFromSamples(new Uint8Array([0, 255]))).toBe(1);
  });

  it("stays inside 0..1", () => {
    const level = levelFromSamples(new Uint8Array([100, 140, 90, 160]));
    expect(level).toBeGreaterThan(0);
    expect(level).toBeLessThanOrEqual(1);
  });
});
