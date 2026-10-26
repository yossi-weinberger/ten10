import { useLayoutEffect, useRef } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CHECK_LONG_ARM,
  CHECK_SHORT_ARM,
  alignOutline,
  mixOutlines,
  outlinePath,
  resamplePolygon,
  type Point,
} from "./brandCheck.utils";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH } from "./logoPaths";
import { SymbolSvg } from "./SymbolSvg";

interface BrandSaveIconProps {
  /** `saving` turns like `BrandInlineSpinner`; `saved` settles and becomes a check mark. */
  status: "saving" | "saved";
  /** Size and spacing classes; defaults to icon size (`h-4 w-4`). */
  className?: string;
}

type Part = "ring" | "slice";

const OUTLINE_POINTS = 72;
const SYMBOL_PATHS: Record<Part, string> = { ring: SYMBOL_RING_PATH, slice: SYMBOL_SLICE_PATH };
const ARM_PATHS: Record<Part, string> = {
  ring: outlinePath(CHECK_LONG_ARM),
  slice: outlinePath(CHECK_SHORT_ARM),
};

/** One turn while saving, the same pace as `animate-spin` (and `BrandInlineSpinner`). */
const SPIN_MS = 1000;

/** Milliseconds after the settle ends. */
const CHECK_TIMING = { click: -60, morph: 0, morphDuration: 300, pop: 280 };

type CheckMorph = Record<Part, [from: Point[], to: Point[]]>;

// The ring and slice outlines, sampled once per page, each paired with the arm it becomes.
// null where SVG geometry isn't available (tests): the check then shows without the morph.
let checkMorph: CheckMorph | null | undefined;

function sampleOutline(d: string): Point[] {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", d);
  svg.setAttribute("style", "position:absolute;width:0;height:0;visibility:hidden");
  svg.appendChild(path);
  document.body.appendChild(svg);
  try {
    const length = path.getTotalLength();
    return Array.from({ length: OUTLINE_POINTS }, (_, i) => {
      const point = path.getPointAtLength((length * i) / OUTLINE_POINTS);
      return [point.x, point.y] as const;
    });
  } finally {
    svg.remove();
  }
}

function getCheckMorph(): CheckMorph | null {
  if (checkMorph === undefined) {
    try {
      const pair = (d: string, arm: Point[]): [Point[], Point[]] => {
        const outline = sampleOutline(d);
        return [outline, alignOutline(outline, resamplePolygon(arm, OUTLINE_POINTS))];
      };
      checkMorph = {
        ring: pair(SYMBOL_RING_PATH, CHECK_LONG_ARM),
        slice: pair(SYMBOL_SLICE_PATH, CHECK_SHORT_ARM),
      };
    } catch {
      checkMorph = null;
    }
  }
  return checkMorph;
}

function shapeAt(part: Part, t: number): string {
  if (t <= 0) return SYMBOL_PATHS[part];
  if (t >= 1) return ARM_PATHS[part];
  const morph = getCheckMorph();
  return morph ? mixOutlines(morph[part][0], morph[part][1], t) : ARM_PATHS[part];
}

/**
 * The Ten10 symbol inside a submit button (#40). While saving it turns like
 * `BrandInlineSpinner`; when the save succeeds it settles upright, the slice clicks in
 * and the whole symbol becomes a check mark: the ring stretches into the long arm and
 * the gold slice into the short one. With reduced motion it pulses while saving and the
 * check appears without the morph.
 *
 * The ring takes the text colour, so it shows on filled buttons. Decorative: the button
 * text says what is happening ("Saving...", "Saved").
 */
export const BrandSaveIcon = ({ status, className }: BrandSaveIconProps) => {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const sliceRef = useRef<SVGGElement>(null);
  const popRef = useRef<SVGGElement>(null);
  const progress = useMotionValue(0);
  const ringPath = useTransform(progress, (t) => shapeAt("ring", t));
  const slicePath = useTransform(progress, (t) => shapeAt("slice", t));
  // The spin's angle when the save succeeded; null when it wasn't spinning.
  const stoppedAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const canAnimate = !reduceMotion && !!svg && typeof svg.animate === "function";

    if (status === "saving") {
      progress.set(0);
      if (!canAnimate) return;
      // Web Animations rather than a CSS class, so the angle can be read when it stops.
      // A transform animation on the <svg> still runs off the main thread.
      const spin = svg.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
        duration: SPIN_MS,
        iterations: Infinity,
      });
      return () => {
        stoppedAt.current = ((Number(spin.currentTime ?? 0) % SPIN_MS) / SPIN_MS) * 360;
        spin.cancel();
      };
    }

    const angle = stoppedAt.current;
    stoppedAt.current = null;
    if (!canAnimate || !getCheckMorph()) {
      progress.set(1);
      return;
    }

    // Settle upright from where the spin stopped. Shown already saved, it goes straight
    // to the check.
    const turn = angle === null ? 0 : (angle > 300 ? 720 : 360) - angle;
    const settleMs = angle === null ? 0 : Math.min(450, Math.max(250, turn * 1.6));
    const from = angle ?? 0;

    const settle = svg.animate(
      [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${from + turn}deg)` }],
      { duration: settleMs, easing: "cubic-bezier(0.3, 0.45, 0.35, 1)", fill: "forwards" }
    );
    const click = sliceRef.current?.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(-4px, 4px)" },
        { transform: "translate(1.5px, -1.5px)" },
        { transform: "translate(0, 0)" },
      ],
      { duration: 240, delay: settleMs + CHECK_TIMING.click, easing: "ease-out" }
    );
    const morph = animate(progress, 1, {
      duration: CHECK_TIMING.morphDuration / 1000,
      delay: (settleMs + CHECK_TIMING.morph) / 1000,
      ease: [0.65, 0, 0.35, 1],
    });
    const pop = popRef.current?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
      { duration: 240, delay: settleMs + CHECK_TIMING.pop, easing: "ease-out" }
    );

    return () => {
      settle.cancel();
      click?.cancel();
      morph.stop();
      pop?.cancel();
    };
  }, [status, reduceMotion, progress]);

  return (
    <SymbolSvg
      ref={svgRef}
      className={cn(
        "h-4 w-4 shrink-0",
        status === "saving" && "motion-reduce:animate-brand-pulse",
        className
      )}
    >
      <g ref={popRef}>
        <motion.path d={ringPath} className="fill-current" />
        <g ref={sliceRef}>
          <motion.path d={slicePath} className="fill-accent" />
        </g>
      </g>
    </SymbolSvg>
  );
};
