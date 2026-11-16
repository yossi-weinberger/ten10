import { useMemo } from "react";
import { SIDEBAR_SIZE } from "@/components/layout/sidebarSize";
import { cn } from "@/lib/utils";
import { BRAND_ZERO_ATTRIBUTE } from "./brandHandoff.utils";
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
 * It renders the whole logo row: the SVG is as wide as the expanded sidebar, pinned to
 * the inline-start edge, and the row clips it as the sidebar narrows. The ring carries
 * `data-brand-zero` so the first-load handoff can find its position.
 */
export const BrandSidebarLogo = ({ expanded, dir }: BrandSidebarLogoProps) => {
  const layout = useMemo(() => getSidebarLogoLayout(dir), [dir]);
  const state = expanded ? layout.wide : layout.square;
  const glyphMotion = "transition-transform duration-300 ease-in-out motion-reduce:transition-none";

  return (
    <span className={cn("relative block overflow-hidden", SIDEBAR_SIZE.logoRowHeight.className)}>
      <svg
        viewBox={`0 0 ${SIDEBAR_LOGO_ROW.width} ${SIDEBAR_LOGO_ROW.height}`}
        className={cn(
          "absolute top-0 start-0 overflow-visible",
          SIDEBAR_SIZE.expandedWidth.className,
          SIDEBAR_SIZE.logoRowHeight.className
        )}
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
            {/* Hidden while the first-load handoff flies its own copy of the symbol here
                (BRAND_HANDOFF_ATTRIBUTE; a Tailwind variant needs the literal name). */}
            <g
              className={cn(glyphMotion, "[[data-brand-handoff]_&]:opacity-0")}
              style={{ transform: expanded ? "rotate(0deg)" : "rotate(-360deg)" }}
            >
              <path d={SYMBOL_RING_PATH} className="fill-primary" />
              <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
            </g>
            <circle r={SYMBOL_RING_RADIUS} className="fill-none" {...{ [BRAND_ZERO_ATTRIBUTE]: "" }} />
          </g>
        </g>
      </svg>
    </span>
  );
};
