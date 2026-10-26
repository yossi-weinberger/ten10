import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SYMBOL_VIEWBOX } from "./logoPaths";

interface SymbolSvgProps {
  /** Size and animation classes. */
  className?: string;
  children: ReactNode;
}

/**
 * The `<svg>` the symbol components draw in: the symbol's viewBox (ring centred at
 * 0, 0), decorative (`aria-hidden`), and `overflow-visible` so motion can leave the box
 * without changing the component's size.
 */
export const SymbolSvg = ({ className, children }: SymbolSvgProps) => (
  <svg
    viewBox={SYMBOL_VIEWBOX}
    className={cn("overflow-visible", className)}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);
