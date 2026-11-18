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
  SYMBOL_VIEWBOX_SIZE,
} from "./logoPaths";
import { SymbolSvg } from "./SymbolSvg";

interface BrandHandoffSymbolProps {
  /** Size classes; match the loader's spinner (`h-14 w-14`). */
  className?: string;
  /** Called once the symbol has landed, faded out, or finished its reduced-motion spin. */
  onDone?: () => void;
}

/** The OS reduced-motion setting, read on the first paint so the exit does not fade first. */
function systemReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * The loader's symbol on its way out (#20). It measures the sidebar logo's 0
 * (`[data-brand-zero]`) and flies there, unwinding its spin as it lands. Without a
 * visible target it fades out. With reduced motion it keeps a steady spin instead.
 */
export const BrandHandoffSymbol = ({ className, onDone }: BrandHandoffSymbolProps) => {
  const reduceMotion = useReducedMotion() === true || systemReducedMotion();
  const symbolRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  // undefined while measuring, null when there is nowhere to fly.
  const [flight, setFlight] = useState<HandoffFlight | null | undefined>(undefined);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute(BRAND_HANDOFF_ATTRIBUTE, "");

    if (reduceMotion) {
      const timer = window.setTimeout(() => {
        root.removeAttribute(BRAND_HANDOFF_ATTRIBUTE);
        onDoneRef.current?.();
      }, BRAND_HANDOFF_TIMING.fadeDuration * 1000);
      return () => {
        window.clearTimeout(timer);
        root.removeAttribute(BRAND_HANDOFF_ATTRIBUTE);
      };
    }

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
      targetRect && sourceRect && targetRect.width > 0
        ? getHandoffFlight(sourceRect, targetRect)
        : null
    );

    return () => root.removeAttribute(BRAND_HANDOFF_ATTRIBUTE);
  }, [reduceMotion]);

  const { flightDuration, flightEase, startRotation, fadeDuration } = BRAND_HANDOFF_TIMING;

  if (reduceMotion) {
    return (
      <div ref={symbolRef} className={cn("h-14 w-14 animate-spin", className)}>
        <SymbolSvg className="h-full w-full">
          <path d={SYMBOL_RING_PATH} className="fill-primary" />
          <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
        </SymbolSvg>
      </div>
    );
  }

  // A full transform string (not x / y / scale / rotate) lets framer-motion run the flight
  // with the Web Animations API, off the main thread, so it stays smooth while the app
  // renders its first page.
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
      transition={flight ? { duration: flightDuration, ease: flightEase } : { duration: fadeDuration }}
      onAnimationComplete={() => {
        if (flight === undefined) return;
        // Landed (or faded out): the sidebar shows its own 0 again.
        document.documentElement.removeAttribute(BRAND_HANDOFF_ATTRIBUTE);
        onDone?.();
      }}
    >
      <SymbolSvg className="h-full w-full">
        <path d={SYMBOL_RING_PATH} className="fill-primary" />
        <path d={SYMBOL_SLICE_PATH} className="fill-accent" />
      </SymbolSvg>
    </motion.div>
  );
};
