import { cn } from "@/lib/utils";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH } from "./logoPaths";
import { SymbolSvg } from "./SymbolSvg";

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
 * The spin is on the `<svg>` itself, so it runs off the main thread and keeps turning while
 * the app is busy (brand-motion-guide.md, section 6).
 */
export const BrandSpinner = ({ className }: BrandSpinnerProps) => (
  <SymbolSvg
    className={cn(
      "h-14 w-14 motion-safe:animate-brand-spin motion-reduce:animate-brand-pulse",
      className
    )}
  >
    <path d={SYMBOL_RING_PATH} className="fill-primary" />
    <g className="origin-[0_0] motion-safe:animate-brand-fling">
      <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
    </g>
  </SymbolSvg>
);
