import { cn } from "@/lib/utils";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH } from "./logoPaths";

interface Brand404Props {
  /** Size and spacing classes, e.g. `w-64`. */
  className?: string;
}

/**
 * "404" where the 0 is the Ten10 symbol. It shakes "no", the slice falls to the floor,
 * bounces and rocks until it rests, and the ring turns to look at it. Plays once.
 * With reduced motion the slice is already lying on the floor.
 *
 * Decorative: the page heading carries the "not found" message.
 */
export const Brand404 = ({ className }: Brand404Props) => (
  <svg
    viewBox="-130 -46 260 124"
    className={cn("w-64 overflow-visible", className)}
    aria-hidden="true"
    focusable="false"
  >
    <text x={-84} y={38} textAnchor="middle" className="fill-primary text-[104px] font-bold">
      4
    </text>
    <text x={84} y={38} textAnchor="middle" className="fill-primary text-[104px] font-bold">
      4
    </text>
    <g className="motion-safe:animate-brand-404-shake">
      <g className="origin-[0_0] rotate-12 motion-safe:animate-brand-404-look">
        <path d={SYMBOL_RING_PATH} className="fill-primary" />
      </g>
      {/* Resting pose on the floor; the fall animation starts from the slice's place in the ring. */}
      <g className="origin-center [transform-box:fill-box] [transform:translate(-9px,81px)_rotate(100deg)] motion-safe:animate-brand-404-fall">
        <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
      </g>
    </g>
  </svg>
);
