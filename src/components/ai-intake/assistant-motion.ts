import type { Transition, Variants } from "framer-motion";

export const EASE_OUT_QUART = [0.25, 1, 0.5, 1] as const;

export const enter: Transition = { duration: 0.22, ease: EASE_OUT_QUART };

export const turnVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: enter },
};

export const blockListVariants: Variants = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export const fieldVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: enter },
};

export function greetingKey(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if (hour >= 17 && hour <= 21) return "evening";
  return "night";
}
