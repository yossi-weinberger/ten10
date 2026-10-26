import { describe, expect, it } from "vitest";
import {
  CHECK_ARMS,
  CHECK_LONG_ARM,
  CHECK_SHORT_ARM,
  alignOutline,
  barOutline,
  mixOutlines,
  outlinePath,
  resamplePolygon,
  signedArea,
  type Point,
} from "./brandCheck.utils";

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

  it("stay within the ring's width", () => {
    for (const [x, y] of [...CHECK_SHORT_ARM, ...CHECK_LONG_ARM]) {
      expect(Math.abs(x)).toBeLessThan(40);
      expect(Math.abs(y)).toBeLessThan(40);
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
