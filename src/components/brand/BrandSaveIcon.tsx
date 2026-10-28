import { useLayoutEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CHECK_TIMING, checkShapeAt, easeInOutCubic, getSettle } from "./brandCheck.utils";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH } from "./logoPaths";
import { SymbolSvg } from "./SymbolSvg";

interface BrandSaveIconProps {
  /** `saving` turns like `BrandInlineSpinner`; `saved` settles and becomes a check mark. */
  status: "saving" | "saved";
  /** Size and spacing classes; defaults to icon size (`h-4 w-4`). */
  className?: string;
}

/** One turn while saving, the same pace as `animate-spin` (and `BrandInlineSpinner`). */
const SPIN_MS = 1000;

/**
 * The Ten10 symbol inside a submit button (#40). While saving it turns like
 * `BrandInlineSpinner`; when the save succeeds it settles upright, the slice clicks in
 * and the whole symbol becomes a check mark: the ring stretches into the long arm and
 * the slice into the short one, fading from gold to the ring's colour on the way, so the
 * check is one colour. With reduced motion it pulses while saving and the check appears
 * without the morph.
 *
 * The ring (and the check) take the text colour, so they show on filled buttons.
 * Decorative: the button text says what is happening ("Saving...", "Saved").
 *
 * The motion starts from a measured angle and at computed times, so it uses the Web
 * Animations API and one `requestAnimationFrame` loop for the morph instead of the
 * `brand-*` Tailwind utilities (brand-motion-guide.md, section 1).
 */
export const BrandSaveIcon = ({ status, className }: BrandSaveIconProps) => {
  const reduceMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const popRef = useRef<SVGGElement>(null);
  const sliceRef = useRef<SVGGElement>(null);
  const ringPathRef = useRef<SVGPathElement>(null);
  const goldSlicePathRef = useRef<SVGPathElement>(null);
  const checkSlicePathRef = useRef<SVGPathElement>(null);
  // The spin's angle when the save succeeded; null when it wasn't spinning.
  const stoppedAt = useRef<number | null>(null);

  // A layout effect, so the spin hands over to the settle before the next paint and the
  // symbol never jumps.
  useLayoutEffect(() => {
    // `t` from 0 (the symbol) to 1 (the check). The slice turns from gold to the text
    // colour on the way: a text-coloured copy fades in over it, and the gold one goes
    // once it is covered.
    const drawCheck = (t: number) => {
      ringPathRef.current?.setAttribute("d", checkShapeAt("ring", t));
      const slice = checkShapeAt("slice", t);
      goldSlicePathRef.current?.setAttribute("d", slice);
      goldSlicePathRef.current?.setAttribute("opacity", t >= 1 ? "0" : "1");
      checkSlicePathRef.current?.setAttribute("d", slice);
      checkSlicePathRef.current?.setAttribute("opacity", String(Math.min(1, Math.max(0, t))));
    };

    const svg = svgRef.current;
    const canAnimate = !reduceMotion && !!svg && typeof svg.animate === "function";

    if (status === "saving") {
      drawCheck(0);
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
    if (!canAnimate) {
      drawCheck(1);
      return;
    }

    // Settle upright from where the spin stopped (shown already saved, there is no settle).
    const animations: Animation[] = [];
    const settle = angle === null ? null : getSettle(angle);
    const settleMs = settle?.ms ?? 0;
    if (settle && angle !== null) {
      animations.push(
        svg.animate(
          [{ transform: `rotate(${angle}deg)` }, { transform: `rotate(${angle + settle.turn}deg)` }],
          { duration: settle.ms, easing: "cubic-bezier(0.3, 0.45, 0.35, 1)", fill: "forwards" }
        )
      );
    }
    const click = sliceRef.current?.animate(
      [
        { transform: "translate(0, 0)" },
        { transform: "translate(-4px, 4px)" },
        { transform: "translate(1.5px, -1.5px)" },
        { transform: "translate(0, 0)" },
      ],
      { duration: CHECK_TIMING.clickMs, delay: settleMs + CHECK_TIMING.clickAt, easing: "ease-out" }
    );
    const pop = popRef.current?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }],
      { duration: CHECK_TIMING.popMs, delay: settleMs + CHECK_TIMING.popAt, easing: "ease-out" }
    );
    if (click) animations.push(click);
    if (pop) animations.push(pop);

    // The morph changes path shapes, which CSS can't animate, so it runs in a short
    // frame loop once the settle ends.
    const morphStart = performance.now() + settleMs;
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, Math.max(0, (now - morphStart) / CHECK_TIMING.morphMs));
      drawCheck(easeInOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
    };
  }, [status, reduceMotion]);

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
        <path ref={ringPathRef} d={SYMBOL_RING_PATH} className="fill-current" />
        <g ref={sliceRef}>
          <path ref={goldSlicePathRef} d={SYMBOL_SLICE_PATH} className="fill-accent" />
          <path ref={checkSlicePathRef} d={SYMBOL_SLICE_PATH} className="fill-current" opacity={0} />
        </g>
      </g>
    </SymbolSvg>
  );
};
