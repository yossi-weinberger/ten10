// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { getReadingProgress, scrollerAfterScroll } from "./useReadingProgress";

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

describe("scrollerAfterScroll", () => {
  // page > outer area (page + footer) > content box that can scroll itself
  const build = () => {
    const page = document.createElement("div");
    const outer = document.createElement("div");
    const content = document.createElement("div");
    const sibling = document.createElement("div");
    const inner = document.createElement("div");
    page.append(outer, sibling);
    outer.append(content);
    content.append(inner);
    return { page, outer, content, sibling, inner };
  };

  it("keeps the content box when the outer area scrolls", () => {
    const { outer, content } = build();
    expect(scrollerAfterScroll(content, outer, content)).toBe(content);
  });

  it("switches to a box nearer the content once it scrolls", () => {
    const { page, outer, content } = build();
    expect(scrollerAfterScroll(outer, content, content)).toBe(content);
    expect(scrollerAfterScroll(page, outer, content)).toBe(outer);
  });

  it("ignores scrolls that don't move the content", () => {
    const { content, sibling, inner } = build();
    expect(scrollerAfterScroll(content, sibling, content)).toBeNull();
    expect(scrollerAfterScroll(content, inner, content)).toBeNull();
  });
});
