import { describe, expect, it } from "vitest";
import { LOGO_LETTERS, LOGO_ZERO_CENTER, SQUARE_LOGO_VIEWBOX, WIDE_LOGO_VIEWBOX } from "./logoPaths";
import {
  getSidebarLogoLayout,
  SIDEBAR_LOGO_ROW,
  toCssTransform,
  type GlyphTransform,
} from "./sidebarLogoLayout.utils";

const apply = (t: GlyphTransform, [x, y]: readonly [number, number]) => [
  t.x + x * t.scale,
  t.y + y * t.scale,
];

describe("getSidebarLogoLayout", () => {
  const [wideMinX, wideMinY, wideWidth, wideHeight] = WIDE_LOGO_VIEWBOX;

  it("places the wide logo 16px from the inline-start edge, 28px tall and centred", () => {
    const ltr = getSidebarLogoLayout("ltr").wide.T;
    const [left, top] = apply(ltr, [wideMinX, wideMinY]);
    const [, bottom] = apply(ltr, [wideMinX, wideMinY + wideHeight]);
    expect(left).toBeCloseTo(16);
    expect(top).toBeCloseTo(4);
    expect(bottom).toBeCloseTo(32);

    const rtl = getSidebarLogoLayout("rtl").wide.T;
    const [right] = apply(rtl, [wideMinX + wideWidth, wideMinY]);
    expect(right).toBeCloseTo(SIDEBAR_LOGO_ROW.width - 16);
  });

  it("uses one transform for every glyph of the wide logo", () => {
    const { wide } = getSidebarLogoLayout("ltr");
    expect(new Set(Object.values(wide)).size).toBe(1);
  });

  it("centres the square logo in the collapsed 64px rail", () => {
    for (const [dir, railCenter] of [
      ["ltr", 32],
      ["rtl", SIDEBAR_LOGO_ROW.width - 32],
    ] as const) {
      const zero = getSidebarLogoLayout(dir).square["0"];
      const [x] = apply(zero, LOGO_ZERO_CENTER.wide);
      // The ring's centre sits 98.59 / 142.64 of the way across the square logo's 36px box.
      const [squareMinX, , squareWidth] = SQUARE_LOGO_VIEWBOX;
      const expected = railCenter - 18 + ((LOGO_ZERO_CENTER.square[0] - squareMinX) / squareWidth) * 36;
      expect(x).toBeCloseTo(expected);
    }
  });

  it("maps each letter's anchor to its position in logo.svg", () => {
    const { square } = getSidebarLogoLayout("ltr");
    const [squareMinX, squareMinY, squareWidth] = SQUARE_LOGO_VIEWBOX;
    const s = 36 / squareWidth;
    for (const letter of LOGO_LETTERS) {
      const [x, y] = apply(square[letter.key], letter.wideAnchor);
      expect(x).toBeCloseTo(14 + (letter.squareAnchor[0] - squareMinX) * s);
      expect(y).toBeCloseTo((36 - SQUARE_LOGO_VIEWBOX[3] * s) / 2 + (letter.squareAnchor[1] - squareMinY) * s);
    }
  });
});

describe("toCssTransform", () => {
  it("formats a translate followed by a scale", () => {
    expect(toCssTransform({ x: 1.234, y: -5, scale: 0.5 })).toBe(
      "translate(1.23px, -5.00px) scale(0.50000)"
    );
  });
});
