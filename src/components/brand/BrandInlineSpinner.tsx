import { cn } from "@/lib/utils";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH } from "./logoPaths";
import { SymbolSvg } from "./SymbolSvg";

interface BrandInlineSpinnerProps {
  /** Size and spacing classes; defaults to icon size (`h-4 w-4`). */
  className?: string;
  /**
   * `brand` draws the ring in the theme's teal (toasts, lists, outline buttons). `current`
   * draws it in the text colour, for filled buttons where teal would vanish into the
   * background. The slice stays gold either way.
   */
  tone?: "brand" | "current";
}

/**
 * Small inline loading indicator built from the Ten10 symbol (#39), in place of a
 * generic spinner icon next to text such as "Loading..." or inside a busy button.
 *
 * It turns at a steady pace like `animate-spin`, without `BrandSpinner`'s rhythm and
 * flung slice, which don't read at icon size. The turn is on the `<svg>` itself, so it
 * runs off the main thread. With reduced motion it pulses instead.
 *
 * Decorative: always pair it with text that says what is loading.
 */
export const BrandInlineSpinner = ({ className, tone = "brand" }: BrandInlineSpinnerProps) => (
  <SymbolSvg
    className={cn(
      "h-4 w-4 shrink-0 motion-safe:animate-spin motion-reduce:animate-brand-pulse",
      className
    )}
  >
    <path d={SYMBOL_RING_PATH} className={tone === "current" ? "fill-current" : "fill-primary"} />
    <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
  </SymbolSvg>
);
