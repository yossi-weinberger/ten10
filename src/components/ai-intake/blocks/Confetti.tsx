import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT_QUART } from "../assistant-motion";

const COLORS = ["bg-primary", "bg-accent", "bg-success", "bg-warning", "bg-yellow-400"] as const;
const PIECES = Array.from({ length: 14 }, (_, index) => {
  const angle = (index / 14) * Math.PI * 2;
  const reach = 28 + (index % 3) * 10;
  return {
    x: Math.cos(angle) * reach,
    y: Math.sin(angle) * reach - 10,
    rotate: (index % 2 ? 1 : -1) * (90 + index * 20),
    color: COLORS[index % COLORS.length],
    round: index % 3 === 0,
  };
});

/**
 * A short burst from the center of its parent, once per `burst` value above 0.
 * Nothing at all with reduced motion. The parent needs `relative`.
 */
export function Confetti({ burst }: { burst: number }) {
  const reduce = useReducedMotion();
  if (reduce || burst === 0) return null;
  return (
    <span key={burst} data-confetti className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      {PIECES.map((piece, index) => (
        <motion.span
          key={index}
          className={`absolute size-1.5 ${piece.round ? "rounded-full" : "rounded-[1px]"} ${piece.color}`}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6, rotate: 0 }}
          animate={{ x: piece.x, y: piece.y, opacity: 0, scale: 1, rotate: piece.rotate }}
          transition={{ duration: 0.7, ease: EASE_OUT_QUART }}
        />
      ))}
    </span>
  );
}
