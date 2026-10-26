import { describe, expect, it } from "vitest";
import { getHandoffFlight } from "./brandHandoff.utils";

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
