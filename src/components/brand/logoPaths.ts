/**
 * Ten10 symbol geometry shared by the animated brand components.
 *
 * The paths are the ring ("0") and the gold slice from `public/logo/symbol.svg`,
 * re-anchored so the ring's centre sits at (0, 0). Rotations and scales can then
 * use `transform-origin: 0 0` (Tailwind `origin-[0_0]`) on any group that holds them.
 *
 * Geometry worth knowing:
 * - The ring's outer radius is 38 and its inner radius is 21.
 * - The gap in the ring spans roughly -70° to -20° (SVG angles, y pointing down).
 * - The slice sits in that gap, centred on -45°, and is a 45° pie wedge.
 *
 * See `llm-instructions/ui/brand-motion-guide.md`.
 */

export const SYMBOL_RING_PATH =
  "M20.82780,-3.27057c-0.21776,-1.34818 0.53172,-2.67371 1.77333,-3.23579l10.0772,-4.58369c1.78423,-0.80058 3.83109,0.2234 4.29811,2.12735c1.08394,4.50439 1.37218,9.2994 0.6947,14.20856c-2.64351,18.99669 -19.3918,33.24417 -38.55253,32.76026c-23.36233,-0.59043 -40.73704,-21.77337 -36.51019,-44.95425c3.1287,-17.16541 17.90183,-30.13248 35.33255,-31.02989c4.05497,-0.2041 7.95607,0.21184 11.61121,1.16514c1.85928,0.47316 2.83542,2.52118 2.0492,4.26575l-4.5011,9.9902c-0.57169,1.27911 -1.94364,2.05328 -3.32552,1.80839c-1.55373,-0.27262 -3.17084,-0.38919 -4.82946,-0.31076c-9.59142,0.45287 -17.8038,7.57191 -19.61006,17.0032c-2.48791,12.9612 7.2406,24.85476 20.30974,25.1162c9.47374,0.18304 18.01899,-6.19911 20.62852,-15.29945c0.89224,-3.10153 1.0098,-6.14677 0.55329,-9.01869z";

export const SYMBOL_SLICE_PATH =
  "M12.14313,-7.97033c-0.43175,-0.46003 -2.32759,-2.50119 -2.78728,-2.92655c-1.53072,-1.38879 -2.77031,-2.26703 -1.54587,-4.61945l9.01306,-21.95482c0.76862,-1.68406 2.72423,-2.45695 4.43957,-1.76024c3.23775,1.32642 7.52368,3.30379 11.71833,8.0306c3.85522,4.3495 5.00069,7.15773 6.15109,10.05283c0.68139,1.72407 0.23756,3.67276 -1.38279,4.58677c0,0 -21.05398,8.80308 -21.29092,8.95616c-1.22058,0.75035 -2.9259,1.07316 -4.31519,-0.3653z";

/**
 * The ring's centre line (radius 29.5), drawn counter-clockwise from just inside the
 * gap's upper end all the way round to its lower end. Stroked wide inside a `<mask>`
 * with `pathLength={100}`, its dash offset reveals the ring as a percentage.
 */
export const SYMBOL_RING_TRACK_PATH = "M12.93 -26.51 A29.5 29.5 0 1 0 26.51 -12.93";

/** Tight viewBox around the symbol at rest. Motion past it relies on `overflow-visible`. */
export const SYMBOL_VIEWBOX = "-40 -40 80 80";

/** Width (and height) of `SYMBOL_VIEWBOX`, in symbol units. */
export const SYMBOL_VIEWBOX_SIZE = 80;

/** Outer radius of the ring, in symbol units. */
export const SYMBOL_RING_RADIUS = 38;

/** A box in an SVG's own units: `[minX, minY, width, height]`. */
export type ViewBoxRect = readonly [number, number, number, number];

/** viewBox of `public/logo/logo-wide.svg` ("TEN10" on one line). */
export const WIDE_LOGO_VIEWBOX: ViewBoxRect = [
  -57.474609375, -160.34271240234375, 386.5818176269531, 78.66902160644531,
];

/** viewBox of `public/logo/logo.svg` (small "TEN" above a large "10"). */
export const SQUARE_LOGO_VIEWBOX: ViewBoxRect = [
  -4.1180808544158936, 22.623353958129883, 142.64423441886902, 124.82409477233887,
];

export type LogoGlyphKey = "T" | "E" | "N" | "1" | "0";

export interface LogoLetter {
  key: Exclude<LogoGlyphKey, "0">;
  /** The letter's path in `logo-wide.svg` coordinates. */
  path: string;
  /** The path's start point in `logo-wide.svg`. */
  wideAnchor: readonly [number, number];
  /** The same point in `logo.svg`. */
  squareAnchor: readonly [number, number];
  /** Size in `logo.svg` relative to `logo-wide.svg` ("TEN" is drawn at 56%, "1" at full size). */
  squareScale: number;
}

/**
 * The letters of the wordmark. Both logo files draw the same glyphs, so each letter's
 * square position is its wide path scaled by `squareScale` around the anchor.
 */
export const LOGO_LETTERS: readonly LogoLetter[] = [
  {
    key: "T",
    path: "M-24.77461,-150.74271h10.8c3.33333,0 5,1.66667 5,5v55.9c0,3.33333 -1.66667,5 -5,5h-10.8c-3.33333,0 -5,-1.66667 -5,-5v-55.9c0,-3.33333 1.66667,-5 5,-5zM-51.97461,-159.84271h68c3.33333,0 5,1.66667 5,5v8.4c0,3.33333 -1.66667,5 -5,5h-68c-3.33333,0 -5,-1.66667 -5,-5v-8.4c0,-3.33333 1.66667,-5 5,-5z",
    wideAnchor: [-24.77461, -150.74271],
    squareAnchor: [14.41392, 28.21936],
    squareScale: 0.56,
  },
  {
    key: "E",
    path: "M93.35699,-124.84271v5c0,3.33333 -1.66667,5 -5,5h-44.9c-3.33333,0 -5,-1.66667 -5,-5v-5c0,-3.33333 1.66667,-5 5,-5h44.9c3.33333,0 5,1.66667 5,5zM51.75361,-117.40767l-3.29324,20.22993c-0.53559,3.29002 -1.91393,3.69228 -4.13503,1.20676l-1.73669,-1.94344c-2.2211,-2.48552 -1.66499,-3.72828 1.66835,-3.72828h47.4c3.33333,0 5,1.66667 5,5v6.8c0,3.33333 -1.66667,5 -5,5h-59.7c-3.33333,0 -4.74954,-1.64774 -4.24863,-4.94322l4.19726,-27.61356c0.50091,-3.29548 0.50091,-6.59096 0,-9.88644l-4.19726,-27.61356c-0.50091,-3.29548 0.9153,-4.94322 4.24863,-4.94322h59.2c3.33333,0 5,1.66667 5,5v6.8c0,3.33333 -1.66667,5 -5,5h-46.9c-3.33333,0 -3.88945,-1.24276 -1.66835,-3.72828l1.73669,-1.94344c2.2211,-2.48552 3.59945,-2.08327 4.13503,1.20676l3.29324,20.22993c0.53559,3.29002 0.53559,6.58005 0,9.87007z",
    wideAnchor: [93.35699, -124.84271],
    squareAnchor: [80.41424, 42.72336],
    squareScale: 0.56,
  },
  {
    key: "N",
    path: "M172.28543,-98.74553l-0.52008,0.10564c-1.95997,0.39812 -2.93996,-0.40282 -2.93996,-2.40282v-53.8c0,-3.33333 1.66667,-5 5,-5h10.1c3.33333,0 5,1.66667 5,5v65c0,3.33333 -1.66667,5 -5,5h-16.1c-3.33333,0 -5.9574,-1.36424 -7.87221,-4.09273l-38.70447,-55.15163c-1.14888,-1.63709 -0.74396,-2.65773 1.21478,-3.06191l0.4238,-0.08745c1.95873,-0.40418 2.9381,0.39373 2.9381,2.39373v55c0,3.33333 -1.66667,5 -5,5h-10.1c-3.33333,0 -5,-1.66667 -5,-5v-65c0,-3.33333 1.66667,-5 5,-5h16.8c3.33333,0 5.96105,1.36168 7.88315,4.08503l38.08696,53.96396c1.15326,1.63401 0.7499,2.65008 -1.21007,3.0482z",
    wideAnchor: [172.28543, -98.74553],
    squareAnchor: [123.79955, 57.33777],
    squareScale: 0.56,
  },
  {
    key: "1",
    path: "M240.52539,-154.84271v65c0,3.33333 -1.66667,5 -5,5h-10.5c-3.33333,0 -5,-1.66667 -5,-5v-57.8c0,-3.33333 1.22223,-3.86689 3.66669,-1.60068l2.26663,2.10135c2.44446,2.26622 2.02538,3.68897 -1.25723,4.26825l-22.45216,3.96215c-3.28261,0.57928 -4.92392,-0.79774 -4.92392,-4.13107v-6c0,-3.33333 1.63202,-5.33806 4.89606,-6.01418l18.20787,-3.77163c3.26404,-0.67612 6.56273,-1.01418 9.89606,-1.01418h5.2c3.33333,0 5,1.66667 5,5z",
    wideAnchor: [240.52539, -154.84271],
    squareAnchor: [49.86486, 76.62379],
    squareScale: 1,
  },
];

/** Where the ring's centre (the symbol's origin) sits in each logo file. */
export const LOGO_ZERO_CENTER = {
  wide: [289.16715, -120.19178],
  square: [98.58607, 108.92937],
} as const;
