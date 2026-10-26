import { describe, expect, it } from "vitest";
import { getHandoffFlight, getRingRect } from "./brandHandoff.utils";

describe("getHandoffFlight", () => {
  it("moves the source centre onto the target centre and scales to its size", () => {
    const source = { left: 500, top: 300, width: 56, height: 56 };
    const target = { left: 1200, top: 20, width: 14, height: 14 };
    expect(getHandoffFlight(source, target)).toEqual({ x: 679, y: -301, scale: 0.25 });
  });

  it("keeps the scale at 1 when the source has no size", () => {
    const empty = { left: 0, top: 0, width: 0, height: 0 };
    expect(getHandoffFlight(empty, { left: 10, top: 10, width: 20, height: 20 }).scale).toBe(1);
  });
});

describe("getRingRect", () => {
  it("keeps the turned box's centre and takes the size from the layout width", () => {
    // A 56px box turned by 60° measures 56 × (cos 60° + sin 60°) ≈ 76.5px across.
    const turned = { left: 471.75, top: 271.75, width: 76.5, height: 76.5 };
    const ring = getRingRect(turned, 56, 0.95);
    expect(ring.width).toBeCloseTo(53.2);
    expect(ring.height).toBeCloseTo(53.2);
    expect(ring.left + ring.width / 2).toBeCloseTo(510);
    expect(ring.top + ring.height / 2).toBeCloseTo(310);
  });
});
