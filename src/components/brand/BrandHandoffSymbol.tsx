import { useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BRAND_HANDOFF_ATTRIBUTE,
  BRAND_HANDOFF_TIMING,
  BRAND_ZERO_ATTRIBUTE,
  getHandoffFlight,
  getRingRect,
  type HandoffFlight,
} from "./brandHandoff.utils";
import {
  SYMBOL_RING_PATH,
  SYMBOL_RING_RADIUS,
  SYMBOL_SLICE_PATH,
  SYMBOL_VIEWBOX,
  SYMBOL_VIEWBOX_SIZE,
} from "./logoPaths";

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
  const symbolRef = useRef<HTMLDivElement>(null);
  const finishedRef = useRef(false);
  // undefined while measuring, null when there is nowhere to fly.
  const [flight, setFlight] = useState<HandoffFlight | null | undefined>(undefined);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute(BRAND_HANDOFF_ATTRIBUTE, "");

    const target = document.querySelector(`[${BRAND_ZERO_ATTRIBUTE}]`);
    const targetRect = target?.getBoundingClientRect();
    // The symbol is already mid-turn here, so measure its ring from the layout size.
    const symbol = symbolRef.current;
    const sourceRect = symbol
      ? getRingRect(
          symbol.getBoundingClientRect(),
          symbol.offsetWidth,
          (2 * SYMBOL_RING_RADIUS) / SYMBOL_VIEWBOX_SIZE
        )
      : undefined;
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
  // A full transform string (not x / y / scale / rotate) lets framer-motion run the flight
  // with the Web Animations API, off the main thread, so it stays smooth while the app
  // renders its first page.
  const startRotation = reduceMotion ? 0 : timing.startRotation;

  return (
    <motion.div
      ref={symbolRef}
      className={cn("h-14 w-14", className)}
      initial={{
        opacity: 1,
        transform: `translateX(0px) translateY(0px) scale(1) rotate(${startRotation}deg)`,
      }}
      animate={
        flight
          ? {
              transform: `translateX(${flight.x}px) translateY(${flight.y}px) scale(${flight.scale}) rotate(0deg)`,
            }
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
      </svg>
    </motion.div>
  );
};
