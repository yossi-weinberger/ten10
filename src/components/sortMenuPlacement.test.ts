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
    { viewportHeight: 568, triggerBottom: 200, side: "bottom" as const, maxHeight: 280 },
    { viewportHeight: 568, triggerBottom: 500, side: "top" as const, maxHeight: 396 },
    { viewportHeight: 844, triggerBottom: 366, side: "bottom" as const, maxHeight: 390 },
    { viewportHeight: 844, triggerBottom: 200, side: "bottom" as const, maxHeight: 556 },
    { viewportHeight: 844, triggerBottom: 500, side: "bottom" as const, maxHeight: 256 },
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
    ).toEqual({ side: "top", maxHeight: 262 });
  });
});
