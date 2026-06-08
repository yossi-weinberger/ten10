import { motion, useReducedMotion } from "framer-motion";

// Bars aligned from the top, tallest in center → silhouette reads as ▼
const HEIGHTS = [5, 13, 24, 13, 5];
const DELAYS  = [0.28, 0.14, 0, 0.14, 0.28]; // ripple outward from center

export function HeroScrollIndicator() {
  const rm = useReducedMotion();

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex flex-col items-center gap-3"
      style={{ bottom: "max(2.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/40">
        גלול לגלות
      </p>

      <div className="flex items-start gap-[4px]" style={{ height: 24 }}>
        {HEIGHTS.map((h, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-primary"
            style={{ height: h }}
            animate={
              rm
                ? undefined
                : { scaleY: [1, 0.2, 1], opacity: [0.75, 0.25, 0.75] }
            }
            transition={{
              duration: 1.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: DELAYS[i],
            }}
          />
        ))}
      </div>
    </div>
  );
}
