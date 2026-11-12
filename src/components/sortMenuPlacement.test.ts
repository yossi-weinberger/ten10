import { describe, expect, it } from "vitest";
import { decideSortMenuPlacement } from "./sortMenuPlacement";

const TRIGGER_HEIGHT = 44;

function place(viewportHeight: number, triggerBottom: number) {
  return decideSortMenuPlacement({
    triggerTop: triggerBottom - TRIGGER_HEIGHT,
    triggerBottom,
    viewportHeight,
    safeAreaBottom: 0,
    headerClearance: 52,
  });
}

describe("decideSortMenuPlacement", () => {
  it.each([
    { viewportHeight: 568, triggerBottom: 366, side: "bottom" as const, maxHeight: 114 },
    { viewportHeight: 568, triggerBottom: 402, side: "bottom" as const, maxHeight: 78 },
    { viewportHeight: 568, triggerBottom: 418, side: "bottom" as const, maxHeight: 62 },
    { viewportHeight: 568, triggerBottom: 440, side: "top" as const, maxHeight: 336 },
    { viewportHeight: 844, triggerBottom: 366, side: "bottom" as const, maxHeight: 390 },
    { viewportHeight: 844, triggerBottom: 402, side: "bottom" as const, maxHeight: 354 },
    { viewportHeight: 844, triggerBottom: 418, side: "bottom" as const, maxHeight: 338 },
    { viewportHeight: 844, triggerBottom: 440, side: "bottom" as const, maxHeight: 316 },
  ])(
    "viewport $viewportHeight trigger bottom $triggerBottom opens $side at $maxHeight",
    ({ viewportHeight, triggerBottom, side, maxHeight }) => {
      expect(place(viewportHeight, triggerBottom)).toEqual({ side, maxHeight });
    },
  );

  it("subtracts the bottom safe area from the space under the trigger", () => {
    expect(
      decideSortMenuPlacement({
        triggerTop: 322,
        triggerBottom: 366,
        viewportHeight: 568,
        safeAreaBottom: 34,
        headerClearance: 52,
      }),
    ).toEqual({ side: "bottom", maxHeight: 80 });
  });
});
