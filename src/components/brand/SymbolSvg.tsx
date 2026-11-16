import type { ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { SYMBOL_VIEWBOX } from "./logoPaths";

interface SymbolSvgProps {
  /** Size and animation classes. */
  className?: string;
  children: ReactNode;
  /** For components that measure or animate the `<svg>` itself. */
  ref?: Ref<SVGSVGElement>;
}

/**
 * The `<svg>` the symbol components draw in: the symbol's viewBox (ring centred at
 * 0, 0), decorative (`aria-hidden`), and `overflow-visible` so motion can leave the box
 * without changing the component's size.
 */
export const SymbolSvg = ({ className, children, ref }: SymbolSvgProps) => (
  <svg
    ref={ref}
    viewBox={SYMBOL_VIEWBOX}
    className={cn("overflow-visible", className)}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);
