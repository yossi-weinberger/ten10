/**
 * First-load handoff (#20): when the app shell appears, the loader's symbol flies into
 * the 0 of the sidebar logo while the loader fades away.
 */

/** Set on `<html>` while the handoff runs, so the sidebar hides its own 0 until it lands. */
export const BRAND_HANDOFF_ATTRIBUTE = "data-brand-handoff";

/** Marks the element (a circle the size of the ring) the handoff flies to. */
export const BRAND_ZERO_ATTRIBUTE = "data-brand-zero";

/** Timing in seconds, as framer-motion expects. */
export const BRAND_HANDOFF_TIMING = {
  flightDuration: 0.7,
  flightEase: [0.65, 0, 0.25, 1] as [number, number, number, number],
  /** The symbol starts mid-turn and unwinds to rest as it lands. */
  startRotation: -300,
  backdropDelay: 0.15,
  backdropDuration: 0.45,
  textFadeDuration: 0.2,
  /** Without a target, or with reduced motion, the loader just fades out. */
  fadeDuration: 0.2,
} as const;

interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface HandoffFlight {
  x: number;
  y: number;
  scale: number;
}

/** Translation and scale that move the `source` ring onto the `target` ring. */
export function getHandoffFlight(source: RectLike, target: RectLike): HandoffFlight {
  return {
    x: target.left + target.width / 2 - (source.left + source.width / 2),
    y: target.top + target.height / 2 - (source.top + source.height / 2),
    scale: source.width > 0 ? target.width / source.width : 1,
  };
}
