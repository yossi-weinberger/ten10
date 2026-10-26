import { useId } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getBrandProgressParts } from "./brandProgress.utils";
import {
  SYMBOL_RING_PATH,
  SYMBOL_RING_TRACK_PATH,
  SYMBOL_SLICE_PATH,
  SYMBOL_VIEWBOX,
} from "./logoPaths";

interface BrandProgressProps {
  /** Progress from 0 to 100. */
  value: number;
  /** Size and spacing classes, e.g. `h-14 w-14`. */
  className?: string;
  /**
   * Ease between values (default), for progress that jumps, like an import. Turn it off
   * when the value already moves continuously, like reading progress driven by scroll:
   * the fill can't be eased off the main thread, so easing every small step repaints the
   * symbol on every frame.
   */
  smooth?: boolean;
}

/** How far (in symbol units) the slice starts from its place before it drops in. */
const SLICE_DROP_DISTANCE = 11;

/**
 * Determinate progress built from the Ten10 symbol: the ring fills up to 90% and the
 * gold slice drops into its gap for the last 10%.
 *
 * Decorative: pair it with visible text that states the progress (e.g. "12 / 40").
 */
export const BrandProgress = ({ value, className, smooth = true }: BrandProgressProps) => {
  const maskId = `brand-progress-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const reduceMotion = useReducedMotion();
  const { ring, slice } = getBrandProgressParts(value);
  const sliceIn = 1 - Math.pow(1 - slice, 3);
  const drop = reduceMotion ? 0 : (1 - sliceIn) * SLICE_DROP_DISTANCE;

  return (
    <svg
      viewBox={SYMBOL_VIEWBOX}
      className={cn("h-14 w-14 overflow-visible", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={-55} y={-55} width={110} height={110}>
          {/* Mask luminance rather than a theme colour: white reveals the ring below. */}
          <path
            d={SYMBOL_RING_TRACK_PATH}
            fill="none"
            stroke="white"
            strokeWidth={20}
            pathLength={100}
            strokeDasharray="100 100"
            style={{ strokeDashoffset: 100 - ring * 100 }}
            className={cn(
              smooth &&
                "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-safe:ease-out"
            )}
          />
        </mask>
      </defs>
      <path d={SYMBOL_RING_PATH} className="fill-primary/15" />
      <path d={SYMBOL_SLICE_PATH} className="fill-accent/25" />
      <path d={SYMBOL_RING_PATH} className="fill-primary" mask={`url(#${maskId})`} />
      <path
        d={SYMBOL_SLICE_PATH}
        className={cn(
          "fill-accent",
          smooth &&
            "motion-safe:transition-[transform,opacity] motion-safe:duration-300 motion-safe:ease-out"
        )}
        style={{ opacity: sliceIn, transform: `translate(${drop}px, ${-drop}px)` }}
      />
    </svg>
  );
};
