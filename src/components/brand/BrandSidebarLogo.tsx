import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  LOGO_LETTERS,
  LOGO_ZERO_CENTER,
  SYMBOL_RING_PATH,
  SYMBOL_RING_RADIUS,
  SYMBOL_SLICE_PATH,
} from "./logoPaths";
import {
  getSidebarLogoLayout,
  SIDEBAR_LOGO_ROW,
  toCssTransform,
} from "./sidebarLogoLayout.utils";

interface BrandSidebarLogoProps {
  /** Expanded sidebar shows the wide logo; collapsed shows the square one. */
  expanded: boolean;
  dir: "rtl" | "ltr";
}

/**
 * The sidebar's logo. When the sidebar collapses, every letter of the wide logo moves
 * to its place in the square logo (and back on expand), while the 0 turns once.
 * Transitions use the sidebar's own `duration-300` so they stay in sync with its width.
 * With reduced motion the logos swap instantly.
 *
 * Render it inside a `relative` box that is 36px tall and clips overflow: the SVG is
 * as wide as the expanded sidebar and is pinned to the inline-start edge.
 * The ring carries `data-brand-zero` so the first-load handoff can find its position.
 */
export const BrandSidebarLogo = ({ expanded, dir }: BrandSidebarLogoProps) => {
  const layout = useMemo(() => getSidebarLogoLayout(dir), [dir]);
  const state = expanded ? layout.wide : layout.square;
  const glyphMotion = "transition-transform duration-300 ease-in-out motion-reduce:transition-none";

  return (
    <svg
      width={SIDEBAR_LOGO_ROW.width}
      height={SIDEBAR_LOGO_ROW.height}
      viewBox={`0 0 ${SIDEBAR_LOGO_ROW.width} ${SIDEBAR_LOGO_ROW.height}`}
      className="absolute top-0 start-0 overflow-visible"
      aria-hidden="true"
      focusable="false"
    >
      {LOGO_LETTERS.map((letter) => (
        <path
          key={letter.key}
          d={letter.path}
          className={cn("fill-primary", glyphMotion)}
          style={{ transform: toCssTransform(state[letter.key]) }}
        />
      ))}
      <g className={glyphMotion} style={{ transform: toCssTransform(state["0"]) }}>
        <g transform={`translate(${LOGO_ZERO_CENTER.wide[0]} ${LOGO_ZERO_CENTER.wide[1]})`}>
          {/* Hidden while the first-load handoff flies its own copy of the symbol here. */}
          <g
            className={cn(glyphMotion, "[[data-brand-handoff]_&]:opacity-0")}
            style={{ transform: expanded ? "rotate(0deg)" : "rotate(-360deg)" }}
          >
            <path d={SYMBOL_RING_PATH} className="fill-primary" />
            <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
          </g>
          <circle r={SYMBOL_RING_RADIUS} className="fill-none" data-brand-zero="" />
        </g>
      </g>
    </svg>
  );
};
