import { describe, expect, it } from "vitest";
import { decideSortMenuPlacement } from "./sortMenuPlacement";

const TRIGGER_HEIGHT = 44;

function place(viewportHeight: number, triggerBottom: number, safeAreaBottom = 0) {
  return decideSortMenuPlacement({
    triggerTop: triggerBottom - TRIGGER_HEIGHT,
    triggerBottom,
    viewportHeight,
    safeAreaBottom,
    headerClearance: 52,
  });
}

describe("decideSortMenuPlacement", () => {
  it.each([
    {
      label: "rest 320x568",
      viewportHeight: 568,
      triggerBottom: 366,
      side: "top" as const,
      maxHeight: 262,
    },
    {
      label: "166px free",
      viewportHeight: 568,
      triggerBottom: 402,
      side: "top" as const,
      maxHeight: 298,
    },
    {
      label: "150px free",
      viewportHeight: 568,
      triggerBottom: 418,
      side: "top" as const,
      maxHeight: 314,
    },
    {
      label: "128px free",
      viewportHeight: 568,
      triggerBottom: 440,
      side: "top" as const,
      maxHeight: 336,
    },
    {
      label: "40px free",
      viewportHeight: 568,
      triggerBottom: 528,
      side: "top" as const,
      maxHeight: 424,
    },
    {
      label: "390x844 rest",
      viewportHeight: 844,
      triggerBottom: 366,
      side: "bottom" as const,
      maxHeight: 390,
    },
    {
      label: "landscape 844x390 with more room below",
      viewportHeight: 390,
      triggerBottom: 200,
      side: "bottom" as const,
      maxHeight: 102,
    },
    {
      label: "landscape 844x390 with more room above",
      viewportHeight: 390,
      triggerBottom: 220,
      side: "top" as const,
      maxHeight: 116,
    },
    {
      label: "landscape 844x390 with room below the minimum",
      viewportHeight: 390,
      triggerBottom: 160,
      side: "bottom" as const,
      maxHeight: 142,
    },
  ])(
    "$label opens $side at $maxHeight",
    ({ viewportHeight, triggerBottom, side, maxHeight }) => {
      expect(place(viewportHeight, triggerBottom)).toEqual({ side, maxHeight });
    },
  );

  it("subtracts the bottom safe area before choosing the side", () => {
    expect(place(844, 624)).toEqual({ side: "bottom", maxHeight: 132 });
    expect(place(844, 624, 34)).toEqual({ side: "top", maxHeight: 520 });
  });
});
