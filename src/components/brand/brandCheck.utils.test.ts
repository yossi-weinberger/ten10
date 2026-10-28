import { describe, expect, it } from "vitest";
import {
  CHECK_ARMS,
  CHECK_LONG_ARM,
  CHECK_SHORT_ARM,
  alignOutline,
  barOutline,
  checkShapeAt,
  easeInOutCubic,
  flattenPath,
  getSettle,
  mixOutlines,
  outlinePath,
  resamplePolygon,
  signedArea,
  type Point,
} from "./brandCheck.utils";
import {
  SYMBOL_RING_PATH,
  SYMBOL_RING_RADIUS,
  SYMBOL_SLICE_PATH,
  SYMBOL_VIEWBOX_SIZE,
} from "./logoPaths";

const square: Point[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];

describe("barOutline", () => {
  it("draws a bar halfWidth either side of the line", () => {
    expect(barOutline([0, 0], [10, 0], 2)).toEqual([
      [0, 2],
      [10, 2],
      [10, -2],
      [0, -2],
    ]);
  });

  it("lengthens the bar past its ends", () => {
    const [a, b] = barOutline([0, 0], [10, 0], 2, 1, 3);
    expect(a[0]).toBe(-1);
    expect(b[0]).toBe(13);
  });
});

describe("the check arms", () => {
  it("meet at the corner, where the short arm covers the joint", () => {
    expect(CHECK_ARMS.short.to).toEqual(CHECK_ARMS.long.from);
    const corner = CHECK_ARMS.short.to;
    const xs = CHECK_SHORT_ARM.map(([x]) => x);
    // The short arm runs on past the corner, towards the long arm's side.
    expect(Math.max(...xs)).toBeGreaterThan(corner[0]);
  });

  it("stay within the symbol's box", () => {
    for (const [x, y] of [...CHECK_SHORT_ARM, ...CHECK_LONG_ARM]) {
      expect(Math.abs(x)).toBeLessThan(SYMBOL_VIEWBOX_SIZE / 2);
      expect(Math.abs(y)).toBeLessThan(SYMBOL_VIEWBOX_SIZE / 2);
    }
  });
});

describe("resamplePolygon", () => {
  it("spaces points evenly along the perimeter", () => {
    expect(resamplePolygon(square, 8)).toEqual([
      [0, 0],
      [5, 0],
      [10, 0],
      [10, 5],
      [10, 10],
      [5, 10],
      [0, 10],
      [0, 5],
    ]);
  });
});

describe("alignOutline", () => {
  it("turns a target that runs the other way round", () => {
    const backwards = [...square].reverse();
    const aligned = alignOutline(square, backwards);
    expect(Math.sign(signedArea(aligned))).toBe(Math.sign(signedArea(square)));
  });

  it("starts the target at the point nearest the source's start", () => {
    const shifted: Point[] = [square[2], square[3], square[0], square[1]];
    expect(alignOutline(square, shifted)).toEqual(square);
  });
});

describe("mixOutlines", () => {
  it("is the source at 0, the target at 1 and halfway between at 0.5", () => {
    const moved: Point[] = square.map(([x, y]) => [x + 10, y]);
    expect(mixOutlines(square, moved, 0)).toBe(outlinePath(square));
    expect(mixOutlines(square, moved, 1)).toBe(outlinePath(moved));
    expect(mixOutlines(square, moved, 0.5)).toBe(
      "M5.00,0.00L15.00,0.00L15.00,10.00L5.00,10.00Z"
    );
  });
});

describe("flattenPath", () => {
  it("follows absolute and relative lines and drops the closing corner", () => {
    expect(flattenPath("M0,0 l10,0 l0,10 L0,10 z")).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]);
  });

  it("splits a cubic curve into steps that end on its end point", () => {
    // A straight "curve" from (0, 0) to (12, 0), split into 4 steps.
    const points = flattenPath("M0,0 c4,0 8,0 12,0", 4);
    expect(points).toHaveLength(5);
    expect(points[4]).toEqual([12, 0]);
    for (const [, y] of points) expect(y).toBe(0);
  });

  it("throws on commands it doesn't handle, so a new path shape fails loudly", () => {
    expect(() => flattenPath("M0,0 a5,5 0 0 1 10,0 z")).toThrow(/unsupported/);
  });

  it("reads the symbol's own paths: the ring is a ring, the slice sits in its gap", () => {
    const ring = flattenPath(SYMBOL_RING_PATH).map(([x, y]) => Math.hypot(x, y));
    expect(Math.max(...ring)).toBeCloseTo(SYMBOL_RING_RADIUS, 0);
    expect(Math.min(...ring)).toBeGreaterThan(15);
    for (const [x, y] of flattenPath(SYMBOL_SLICE_PATH)) {
      // Upper right (y grows downwards).
      expect(x).toBeGreaterThan(0);
      expect(y).toBeLessThan(0);
    }
  });
});

describe("checkShapeAt", () => {
  it("is the symbol's path at 0 and the arm at 1", () => {
    expect(checkShapeAt("ring", 0)).toBe(SYMBOL_RING_PATH);
    expect(checkShapeAt("slice", 0)).toBe(SYMBOL_SLICE_PATH);
    expect(checkShapeAt("ring", 1)).toBe(outlinePath(CHECK_LONG_ARM));
    expect(checkShapeAt("slice", 1)).toBe(outlinePath(CHECK_SHORT_ARM));
  });

  it("mixes the two in between, with the same number of points all the way", () => {
    const corners = (path: string) => path.split("L").length;
    expect(corners(checkShapeAt("ring", 0.01))).toBe(corners(checkShapeAt("ring", 0.99)));
    expect(checkShapeAt("slice", 0.5)).toMatch(/^M[-\d.,L]+Z$/);
  });
});

describe("getSettle", () => {
  it("finishes the turn it is on", () => {
    expect(getSettle(200)).toEqual({ turn: 160, ms: 256 });
  });

  it("adds a turn when less than 60° are left, so it never stops abruptly", () => {
    expect(getSettle(330).turn).toBe(390);
  });

  it("keeps the time between 250 and 450 ms", () => {
    expect(getSettle(0).ms).toBe(450);
    expect(getSettle(299).ms).toBe(250);
  });
});

describe("easeInOutCubic", () => {
  it("starts at 0, passes the middle at 0.5 and ends at 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
  });
});
