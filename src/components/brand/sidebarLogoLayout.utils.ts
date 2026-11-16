import { SIDEBAR_SIZE } from "@/components/layout/sidebarSize";
import {
  LOGO_LETTERS,
  LOGO_ZERO_CENTER,
  SQUARE_LOGO_VIEWBOX,
  WIDE_LOGO_VIEWBOX,
  type LogoGlyphKey,
} from "./logoPaths";

/**
 * Pixel geometry of the sidebar's logo row. The row and the sidebar's widths come from
 * `SIDEBAR_SIZE`; the rest are the logos' own sizes in it: the wide logo is 28px tall
 * with 16px inline padding, and the square logo fits a 36px box centred in the
 * collapsed rail.
 */
export const SIDEBAR_LOGO_ROW = {
  width: SIDEBAR_SIZE.expandedWidth.px,
  height: SIDEBAR_SIZE.logoRowHeight.px,
  collapsedWidth: SIDEBAR_SIZE.collapsedWidth.px,
  paddingInline: 16,
  wideLogoHeight: 28,
  squareLogoBox: 36,
} as const;

/** Maps a point `p` (in `logo-wide.svg` units) to `translate + p * scale` pixels. */
export interface GlyphTransform {
  x: number;
  y: number;
  scale: number;
}

export type SidebarLogoLayout = Record<
  "wide" | "square",
  Record<LogoGlyphKey, GlyphTransform>
>;

/**
 * Where every glyph of the wordmark sits in the sidebar's logo row, for the expanded
 * (wide logo) and collapsed (square logo) states. All glyphs are drawn from their
 * `logo-wide.svg` paths, so morphing between the logos is a transform per glyph.
 *
 * Coordinates are pixels from the row's left edge, in a box `SIDEBAR_LOGO_ROW.width`
 * wide that is pinned to the sidebar's inline-start edge (right in RTL, left in LTR).
 */
export function getSidebarLogoLayout(dir: "rtl" | "ltr"): SidebarLogoLayout {
  const row = SIDEBAR_LOGO_ROW;
  const isRtl = dir === "rtl";

  const [wideMinX, wideMinY, wideWidth, wideHeight] = WIDE_LOGO_VIEWBOX;
  const wideScale = row.wideLogoHeight / wideHeight;
  const wideLeft = isRtl
    ? row.width - row.paddingInline - wideWidth * wideScale
    : row.paddingInline;
  const wideTop = (row.height - row.wideLogoHeight) / 2;
  const wide: GlyphTransform = {
    x: wideLeft - wideMinX * wideScale,
    y: wideTop - wideMinY * wideScale,
    scale: wideScale,
  };

  const [squareMinX, squareMinY, squareWidth, squareHeight] = SQUARE_LOGO_VIEWBOX;
  const squareScale = Math.min(row.squareLogoBox / squareWidth, row.squareLogoBox / squareHeight);
  const railCenter = isRtl ? row.width - row.collapsedWidth / 2 : row.collapsedWidth / 2;
  const squareLeft = railCenter - (squareWidth * squareScale) / 2;
  const squareTop = (row.height - squareHeight * squareScale) / 2;

  // A wide-file point p lands at squareAnchor + glyphScale * (p - wideAnchor) in logo.svg.
  const toSquare = (
    wideAnchor: readonly [number, number],
    squareAnchor: readonly [number, number],
    glyphScale: number
  ): GlyphTransform => ({
    x: squareLeft + (squareAnchor[0] - squareMinX) * squareScale - glyphScale * squareScale * wideAnchor[0],
    y: squareTop + (squareAnchor[1] - squareMinY) * squareScale - glyphScale * squareScale * wideAnchor[1],
    scale: glyphScale * squareScale,
  });

  const square = Object.fromEntries(
    LOGO_LETTERS.map((letter) => [
      letter.key,
      toSquare(letter.wideAnchor, letter.squareAnchor, letter.squareScale),
    ])
  ) as Record<Exclude<LogoGlyphKey, "0">, GlyphTransform>;

  return {
    wide: { T: wide, E: wide, N: wide, "1": wide, "0": wide },
    square: { ...square, "0": toSquare(LOGO_ZERO_CENTER.wide, LOGO_ZERO_CENTER.square, 1) },
  };
}

export function toCssTransform({ x, y, scale }: GlyphTransform): string {
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(5)})`;
}
