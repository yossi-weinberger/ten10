import { cn } from "@/lib/utils";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH, SYMBOL_VIEWBOX } from "./logoPaths";

interface BrandSpinnerProps {
  /** Size and spacing classes, e.g. `h-14 w-14`. */
  className?: string;
}

/**
 * Indeterminate loading indicator built from the Ten10 symbol.
 *
 * The symbol spins with an ease-in-out rhythm and the gold slice is flung outward at
 * peak speed, then settles back. With reduced motion it gently pulses instead, so the
 * user still sees that something is loading.
 *
 * Decorative: pair it with visible or `role="status"` text that says what is loading.
 *
 * The spin is on the `<svg>` box itself (centred on the ring), which browsers animate off
 * the main thread, so it keeps turning while the app is busy loading. Only the small
 * fling runs inside the drawing.
 */
export const BrandSpinner = ({ className }: BrandSpinnerProps) => (
  <svg
    viewBox={SYMBOL_VIEWBOX}
    className={cn(
      "h-14 w-14 overflow-visible motion-safe:animate-brand-spin motion-reduce:animate-brand-pulse",
      className
    )}
    aria-hidden="true"
    focusable="false"
  >
    <path d={SYMBOL_RING_PATH} className="fill-primary" />
    <g className="origin-[0_0] motion-safe:animate-brand-fling">
      <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
    </g>
  </svg>
);
