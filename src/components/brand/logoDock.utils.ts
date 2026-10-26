import {
  LOGO_ZERO_CENTER,
  SYMBOL_RING_RADIUS,
  SYMBOL_VIEWBOX_SIZE,
  WIDE_LOGO_VIEWBOX,
  type ViewBoxRect,
} from "./logoPaths";

/**
 * Logo dock (motion lab #38) on the landing page. As the page scrolls, the hero logo's
 * letters reel into the 0 like a tape measure and its glass card collapses around it.
 * The badge then sticks near the top and flies to its dock: the side navigation's logo
 * (2xl screens), where the letters reel back out, or a round button in the free top
 * corner. Everything here is a pure function of the scroll position and measured boxes.
 */

export type DockTarget = "nav" | "corner";

/** Scroll ranges (px) of the three phases. */
export interface DockTiming {
  reel: readonly [number, number];
  fly: readonly [number, number];
  unreel: readonly [number, number];
}

/** Wide screens have a tall hero and room to wait; on phones the badge leaves the title quickly. */
export const DOCK_TIMING = {
  wide: { reel: [0, 200], fly: [150, 400], unreel: [400, 540] },
  narrow: { reel: [0, 120], fly: [30, 190], unreel: [190, 330] },
} as const satisfies Record<string, DockTiming>;

/** The corner dock: a round button of `size` px, `inset` px from the top and the inline end. */
export const DOCK_CORNER = { size: 40, inset: 16, symbolSize: 26 } as const;

/** Letters past this x (logo units: the ring's left edge) are hidden inside the 0. */
export const DOCK_CLIP_X = LOGO_ZERO_CENTER.wide[0] - SYMBOL_RING_RADIUS;

/** How far the letters travel: the whole word, from the logo's left edge past the clip. */
export const DOCK_REEL_DISTANCE = Math.ceil(DOCK_CLIP_X - WIDE_LOGO_VIEWBOX[0]) + 1;

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A logo drawn somewhere: where its 0's centre is and its scale (px per logo unit). */
export interface LogoPlacement {
  zero: Point;
  scale: number;
}

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export interface DockProgress {
  reel: number;
  fly: number;
  unreel: number;
}

/** Eased progress (0–1) of each phase at `scroll` px. Only the nav dock reels back out. */
export function getDockProgress(scroll: number, timing: DockTiming, target: DockTarget): DockProgress {
  const phase = ([from, to]: readonly [number, number]) => easeInOut(clamp01((scroll - from) / (to - from)));
  return {
    reel: phase(timing.reel),
    fly: phase(timing.fly),
    unreel: target === "nav" ? phase(timing.unreel) : 0,
  };
}

/**
 * Where the wide logo's 0 lands in `box` when the logo is fitted inside it (SVG's default
 * `xMidYMid meet`), e.g. an `<img>` of `logo-wide.svg` or the hero logo's `<svg>`.
 */
export function getLogoPlacement(box: Box, viewBox: ViewBoxRect = WIDE_LOGO_VIEWBOX): LogoPlacement {
  const [minX, minY, width, height] = viewBox;
  const scale = Math.min(box.width / width, box.height / height);
  const left = box.left + (box.width - width * scale) / 2;
  const top = box.top + (box.height - height * scale) / 2;
  return {
    zero: { x: left + (LOGO_ZERO_CENTER.wide[0] - minX) * scale, y: top + (LOGO_ZERO_CENTER.wide[1] - minY) * scale },
    scale,
  };
}

/** The corner dock's placement: its symbol is `symbolSize` px across, centred in the button. */
export function getCornerDock(viewportWidth: number, dir: "rtl" | "ltr"): LogoPlacement {
  const { size, inset, symbolSize } = DOCK_CORNER;
  const centre = inset + size / 2;
  return {
    // The corner opposite the page controls: the inline end (left in RTL, right in LTR).
    zero: { x: dir === "rtl" ? centre : viewportWidth - centre, y: centre },
    scale: symbolSize / SYMBOL_VIEWBOX_SIZE,
  };
}

/**
 * Half the collapsed card's side, in px: a square around the symbol, sized so the symbol
 * fills it like the corner button's (`symbolSize` inside `size`).
 */
export function getCollapsedHalf(heroScale: number): number {
  return (SYMBOL_VIEWBOX_SIZE / 2) * heroScale * (DOCK_CORNER.size / DOCK_CORNER.symbolSize);
}

/**
 * Where the badge waits between reeling in and flying: it drifts to the middle of the
 * screen, kept clear of the page controls (language, theme), and stops at the top edge,
 * or below the controls when the still-wide card could reach them (phones).
 */
export function getDockWaitingSpot({
  hero,
  viewportWidth,
  controls,
  dir,
}: {
  hero: LogoPlacement & { card: Box };
  viewportWidth: number;
  controls: Box | null;
  dir: "rtl" | "ltr";
}): { driftX: number; stickTop: number } {
  const gap = 8;
  const half = getCollapsedHalf(hero.scale);
  if (!controls) return { driftX: viewportWidth / 2, stickTop: DOCK_CORNER.inset };
  const controlsRight = controls.left + controls.width;
  const driftX =
    dir === "rtl"
      ? Math.min(viewportWidth / 2, controls.left - gap - half)
      : Math.max(viewportWidth / 2, controlsRight + gap + half);
  const { card } = hero;
  const cardReachesControls = card.left < controlsRight + gap && card.left + card.width > controls.left - gap;
  return {
    driftX,
    stickTop: cardReachesControls ? controls.top + controls.height + gap : DOCK_CORNER.inset,
  };
}

export interface DockPoseInput {
  progress: DockProgress;
  target: DockTarget;
  /** The hero logo as laid out now (it moves with the page), and its glass card. */
  hero: LogoPlacement & { card: Box; cardRadius: number };
  /** Where the 0 drifts to while the letters reel in. */
  driftX: number;
  /** The top edge the collapsed card stops at while it waits to fly. */
  stickTop: number;
  dock: LogoPlacement;
}

export interface DockPose {
  /** Where to draw the logo. */
  logo: LogoPlacement;
  /** The glass card around it. */
  card: Box & { radius: number; opacity: number };
  /** How far the letters have moved into the 0, in logo units. */
  letterShift: number;
  /** The 0's turn, in degrees; whole turns at rest. */
  zeroTurn: number;
}

/** The badge at one moment of the scroll. */
export function getDockPose({ progress, target, hero, driftX, stickTop, dock }: DockPoseInput): DockPose {
  const { reel, fly, unreel } = progress;
  const half = getCollapsedHalf(hero.scale);

  // The 0 follows the page, drifting towards driftX, until the collapsed card would pass
  // stickTop; then it waits there and flies to the dock.
  const waiting = {
    x: lerp(hero.zero.x, driftX, reel),
    y: Math.max(hero.zero.y, stickTop + half),
  };
  const zero = { x: lerp(waiting.x, dock.zero.x, fly), y: lerp(waiting.y, dock.zero.y, fly) };
  const shrink = lerp(1, dock.scale / hero.scale, fly);

  // The card's edges relative to the 0, collapsing to the square, then shrinking with it.
  const { card } = hero;
  const left = lerp(card.left - hero.zero.x, -half, reel) * shrink;
  const right = lerp(card.left + card.width - hero.zero.x, half, reel) * shrink;
  const top = lerp(card.top - hero.zero.y, -half, reel) * shrink;
  const bottom = lerp(card.top + card.height - hero.zero.y, half, reel) * shrink;

  return {
    logo: { zero, scale: hero.scale * shrink },
    card: {
      left: zero.x + left,
      top: zero.y + top,
      width: right - left,
      height: bottom - top,
      // Round for the corner button; the nav has its own glass, so the card fades into it.
      radius: target === "corner" ? lerp(hero.cardRadius, half, fly) * shrink : hero.cardRadius * shrink,
      opacity: target === "nav" ? 1 - clamp01(fly * 1.6) : 1,
    },
    letterShift: DOCK_REEL_DISTANCE * reel * (1 - unreel),
    // One turn while reeling in, one rolling towards the dock, one reeling back out.
    zeroTurn: -360 * reel + (dock.zero.x >= waiting.x ? 360 : -360) * fly + 360 * unreel,
  };
}
