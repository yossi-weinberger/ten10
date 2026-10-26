import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BRAND_HANDOFF_ATTRIBUTE,
  BRAND_HANDOFF_TIMING,
  BRAND_ZERO_ATTRIBUTE,
  getHandoffFlight,
  type HandoffFlight,
} from "./brandHandoff.utils";
import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH, SYMBOL_VIEWBOX } from "./logoPaths";

interface BrandHandoffSymbolProps {
  /** Size classes; match the loader's spinner (`h-14 w-14`). */
  className?: string;
  /** Called once the symbol has landed (or faded out). */
  onDone?: () => void;
}

/**
 * The loader's symbol on its way out (#20). It measures the sidebar logo's 0
 * (`[data-brand-zero]`) and flies there, unwinding its spin as it lands. Without a
 * visible target, or with reduced motion, it fades out instead.
 */
export const BrandHandoffSymbol = ({ className, onDone }: BrandHandoffSymbolProps) => {
  const reduceMotion = useReducedMotion();
  const sourceRef = useRef<SVGCircleElement>(null);
  const finishedRef = useRef(false);
  // undefined while measuring, null when there is nowhere to fly.
  const [flight, setFlight] = useState<HandoffFlight | null | undefined>(undefined);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute(BRAND_HANDOFF_ATTRIBUTE, "");

    const target = document.querySelector(`[${BRAND_ZERO_ATTRIBUTE}]`);
    const targetRect = target?.getBoundingClientRect();
    const sourceRect = sourceRef.current?.getBoundingClientRect();
    setFlight(
      !reduceMotion && targetRect && sourceRect && targetRect.width > 0
        ? getHandoffFlight(sourceRect, targetRect)
        : null
    );

    return () => root.removeAttribute(BRAND_HANDOFF_ATTRIBUTE);
  }, [reduceMotion]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    document.documentElement.removeAttribute(BRAND_HANDOFF_ATTRIBUTE);
    onDone?.();
  };

  const timing = BRAND_HANDOFF_TIMING;

  return (
    <motion.div
      className={cn("h-14 w-14", className)}
      initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: reduceMotion ? 0 : timing.startRotation }}
      animate={
        flight
          ? { x: flight.x, y: flight.y, scale: flight.scale, rotate: 0 }
          : flight === null
            ? { opacity: 0 }
            : undefined
      }
      transition={
        flight
          ? { duration: timing.flightDuration, ease: timing.flightEase }
          : { duration: timing.fadeDuration }
      }
      onAnimationComplete={() => {
        if (flight !== undefined) finish();
      }}
    >
      <svg viewBox={SYMBOL_VIEWBOX} className="h-full w-full overflow-visible" aria-hidden="true" focusable="false">
        <path d={SYMBOL_RING_PATH} className="fill-primary" />
        <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
        <circle ref={sourceRef} r={38} className="fill-none" />
      </svg>
    </motion.div>
  );
};
