import { describe, expect, it } from "vitest";
import { LOGO_ZERO_CENTER, WIDE_LOGO_VIEWBOX } from "./logoPaths";
import {
  DOCK_CLIP_X,
  DOCK_CORNER,
  DOCK_REEL_DISTANCE,
  DOCK_TIMING,
  getCornerDock,
  getDockPose,
  getDockProgress,
  getDockWaitingSpot,
  getLogoPlacement,
  type DockPoseInput,
} from "./logoDock.utils";

const [minX, minY, vbWidth, vbHeight] = WIDE_LOGO_VIEWBOX;

describe("getDockProgress", () => {
  it("is 0 at the top and 1 once each phase has passed", () => {
    expect(getDockProgress(0, DOCK_TIMING.wide, "nav")).toEqual({ reel: 0, fly: 0, unreel: 0 });
    expect(getDockProgress(1000, DOCK_TIMING.wide, "nav")).toEqual({ reel: 1, fly: 1, unreel: 1 });
  });

  it("only reels back out at the nav", () => {
    expect(getDockProgress(1000, DOCK_TIMING.narrow, "corner").unreel).toBe(0);
  });
});

describe("getLogoPlacement", () => {
  it("maps the logo's 0 into a box of the logo's own size", () => {
    const { zero, scale } = getLogoPlacement({ left: 10, top: 20, width: vbWidth, height: vbHeight });
    expect(scale).toBeCloseTo(1);
    expect(zero.x).toBeCloseTo(10 + LOGO_ZERO_CENTER.wide[0] - minX);
    expect(zero.y).toBeCloseTo(20 + LOGO_ZERO_CENTER.wide[1] - minY);
  });

  it("fits the logo inside a box of another shape, centred", () => {
    // An `h-7 w-auto max-w-[4.75rem]` <img>: 76 × 28, so the width limits the logo.
    const { zero, scale } = getLogoPlacement({ left: 0, top: 0, width: 76, height: 28 });
    expect(scale).toBeCloseTo(76 / vbWidth);
    const drawnHeight = vbHeight * scale;
    expect(zero.y).toBeCloseTo((28 - drawnHeight) / 2 + (LOGO_ZERO_CENTER.wide[1] - minY) * scale);
  });
});

describe("getCornerDock", () => {
  it("sits in the corner opposite the page controls", () => {
    expect(getCornerDock(390, "rtl").zero).toEqual({ x: 36, y: 36 });
    expect(getCornerDock(390, "ltr").zero).toEqual({ x: 354, y: 36 });
  });
});

describe("getDockPose", () => {
  const hero = { zero: { x: 940, y: 150 }, scale: 0.91, card: { left: 607, top: 96, width: 386, height: 106 }, cardRadius: 16 };
  const base: Omit<DockPoseInput, "progress"> = {
    target: "corner",
    hero,
    driftX: 800,
    stickTop: 16,
    dock: getCornerDock(1280, "rtl"),
  };

  it("matches the hero logo before any scroll", () => {
    const pose = getDockPose({ ...base, progress: { reel: 0, fly: 0, unreel: 0 } });
    expect(pose.logo).toEqual({ zero: hero.zero, scale: hero.scale });
    expect(pose.card).toMatchObject({ ...hero.card, radius: 16, opacity: 1 });
    expect(pose.letterShift).toBe(0);
    expect(pose.zeroTurn).toBe(0);
  });

  it("collapses the card to a square around the 0 once the word has reeled in", () => {
    const pose = getDockPose({ ...base, progress: { reel: 1, fly: 0, unreel: 0 } });
    expect(pose.logo.zero.x).toBe(800);
    expect(pose.card.width).toBeCloseTo(pose.card.height);
    expect(pose.card.left + pose.card.width / 2).toBeCloseTo(800);
    expect(pose.letterShift).toBe(DOCK_REEL_DISTANCE);
  });

  it("lands as the corner button", () => {
    const dock = base.dock;
    const pose = getDockPose({ ...base, progress: { reel: 1, fly: 1, unreel: 0 } });
    expect(pose.logo.zero).toEqual(dock.zero);
    expect(pose.logo.scale).toBeCloseTo(dock.scale);
    expect(pose.card.width).toBeCloseTo(DOCK_CORNER.size);
    expect(pose.card.height).toBeCloseTo(DOCK_CORNER.size);
    expect(pose.card.radius).toBeCloseTo(DOCK_CORNER.size / 2);
    expect(Math.abs(pose.zeroTurn % 360)).toBe(0);
  });

  it("hands over to the nav: the card fades and the word reels back out", () => {
    const nav = getLogoPlacement({ left: 1491, top: 113, width: 76, height: 28 });
    const pose = getDockPose({ ...base, target: "nav", dock: nav, progress: { reel: 1, fly: 1, unreel: 1 } });
    expect(pose.logo.zero).toEqual(nav.zero);
    expect(pose.card.opacity).toBe(0);
    expect(pose.letterShift).toBe(0);
    expect(Math.abs(pose.zeroTurn % 360)).toBe(0);
  });
});

describe("getDockWaitingSpot", () => {
  const controls = { left: 225, top: 16, width: 149, height: 40 };

  it("waits mid-screen at the top when the card can't reach the controls (wide screens)", () => {
    const hero = { zero: { x: 940, y: 150 }, scale: 0.91, card: { left: 607, top: 96, width: 386, height: 106 } };
    const desktopControls = { left: 1435, top: 16, width: 149, height: 40 };
    expect(getDockWaitingSpot({ hero, viewportWidth: 1600, controls: desktopControls, dir: "rtl" })).toEqual({
      driftX: 800,
      stickTop: DOCK_CORNER.inset,
    });
  });

  it("keeps clear of the controls and waits below them on phones", () => {
    const hero = { zero: { x: 309, y: 119 }, scale: 0.745, card: { left: 42, top: 80, width: 306, height: 77 } };
    const spot = getDockWaitingSpot({ hero, viewportWidth: 390, controls, dir: "rtl" });
    expect(spot.stickTop).toBe(16 + 40 + 8);
    expect(spot.driftX).toBeLessThan(controls.left);
  });
});

it("reels the whole word past the clip edge", () => {
  // The T's leftmost point is inside the viewBox; the viewBox edge itself must clear the clip.
  expect(minX + DOCK_REEL_DISTANCE).toBeGreaterThan(DOCK_CLIP_X);
});
