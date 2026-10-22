import { Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EASE_OUT_QUART } from "./assistant-motion";

export function AssistantMark({
  thinking = false,
  size = "sm",
}: {
  thinking?: boolean;
  size?: "sm" | "md";
}) {
  const reduce = useReducedMotion();
  return (
    <span className={cn(
      "relative inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
      size === "md" ? "size-9" : "size-7",
    )}>
      <motion.span
        className="inline-flex"
        animate={thinking && !reduce ? { scale: [1, 1.08, 1], opacity: [1, 0.8, 1] } : { scale: 1, opacity: 1 }}
        transition={thinking && !reduce ? { duration: 1.6, repeat: Infinity, ease: EASE_OUT_QUART } : { duration: 0 }}
      >
        <Sparkles className={size === "md" ? "size-5" : "size-3.5"} aria-hidden />
      </motion.span>
      <span className="absolute -end-0.5 -top-0.5 size-1.5 rounded-full bg-accent" aria-hidden />
    </span>
  );
}
