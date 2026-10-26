import { cn } from "@/lib/utils";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH, SYMBOL_VIEWBOX } from "./logoPaths";

interface BrandDoneProps {
  /** Size and spacing classes, e.g. `h-12 w-12`. */
  className?: string;
}

/** A check mark that fits inside the ring's hole (inner radius 21). */
const CHECK_PATH = "M-9.5 1 L-3 7.5 L9.5 -6.5";

/**
 * One-shot "done" state of the Ten10 symbol: the last half-turn settles, the slice
 * clicks into place, a ripple leaves the ring and a check mark is drawn inside the 0.
 * With reduced motion the finished state shows straight away.
 *
 * Decorative: pair it with visible text that says what finished.
 */
export const BrandDone = ({ className }: BrandDoneProps) => (
  <svg
    viewBox={SYMBOL_VIEWBOX}
    className={cn("h-12 w-12 overflow-visible", className)}
    aria-hidden="true"
    focusable="false"
  >
    <circle
      r={38}
      strokeWidth={2.4}
      className="fill-none stroke-primary opacity-0 origin-[0_0] motion-safe:animate-brand-done-ripple"
    />
    <g className="origin-[0_0] motion-safe:animate-brand-done-settle">
      <path d={SYMBOL_RING_PATH} className="fill-primary" />
      <g className="motion-safe:animate-brand-done-click">
        <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
      </g>
    </g>
    <path
      d={CHECK_PATH}
      pathLength={100}
      strokeDasharray="100 100"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="fill-none stroke-primary motion-safe:animate-brand-done-check"
    />
  </svg>
);
