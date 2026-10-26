import {
  LOGO_LETTERS,
  LOGO_ZERO_CENTER,
  SQUARE_LOGO_VIEWBOX,
  WIDE_LOGO_VIEWBOX,
  type LogoGlyphKey,
} from "./logoPaths";

/**
 * Pixel geometry of the sidebar's logo row (see `Sidebar.tsx` and `App.tsx`):
 * the sidebar is `w-44` expanded and `w-16` collapsed, the row is 36px tall,
 * the wide logo is `h-7` behind `px-4`, and the square logo is an `h-9 w-9`
 * `object-contain` box centred in the collapsed rail.
 */
export const SIDEBAR_LOGO_ROW = {
  width: 176,
  height: 36,
  collapsedWidth: 64,
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

  const layout: SidebarLogoLayout = {
    wide: { T: wide, E: wide, N: wide, "1": wide, "0": wide },
    square: {
      T: wide,
      E: wide,
      N: wide,
      "1": wide,
      "0": toSquare(LOGO_ZERO_CENTER.wide, LOGO_ZERO_CENTER.square, 1),
    },
  };
  for (const letter of LOGO_LETTERS) {
    layout.square[letter.key] = toSquare(letter.wideAnchor, letter.squareAnchor, letter.squareScale);
  }
  return layout;
}

export function toCssTransform({ x, y, scale }: GlyphTransform): string {
  return `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(5)})`;
}
