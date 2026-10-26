import { describe, expect, it } from "vitest";
import { getReadingProgress } from "./useReadingProgress";

describe("getReadingProgress", () => {
  it("is 0 while the content's top is at the top of the visible area", () => {
    expect(
      getReadingProgress({ contentTop: 100, contentHeight: 2000, viewportTop: 100, viewportHeight: 600 })
    ).toBe(0);
  });

  it("grows as the content scrolls up past the visible area", () => {
    expect(
      getReadingProgress({ contentTop: -600, contentHeight: 2000, viewportTop: 100, viewportHeight: 600 })
    ).toBeCloseTo(0.5);
  });

  it("is 1 once the content's bottom reaches the bottom", () => {
    expect(
      getReadingProgress({ contentTop: -1300, contentHeight: 2000, viewportTop: 100, viewportHeight: 600 })
    ).toBe(1);
  });

  it("clamps before the start and past the end", () => {
    expect(
      getReadingProgress({ contentTop: 400, contentHeight: 2000, viewportTop: 100, viewportHeight: 600 })
    ).toBe(0);
    expect(
      getReadingProgress({ contentTop: -5000, contentHeight: 2000, viewportTop: 100, viewportHeight: 600 })
    ).toBe(1);
  });

  it("counts content that fits in view as read", () => {
    expect(
      getReadingProgress({ contentTop: 0, contentHeight: 300, viewportTop: 0, viewportHeight: 600 })
    ).toBe(1);
  });
});
