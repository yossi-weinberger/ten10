import { motion, useReducedMotion } from "framer-motion";
import { memo } from "react";

const bottomFade =
  "absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#EFEFEF] to-transparent dark:from-background";

export const HeroCssFallbackBackground = memo(function HeroCssFallbackBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {/* Base noise */}
      <div className="absolute inset-0 bg-noise opacity-[0.06] dark:opacity-[0.04]" />

      {/* Static mesh gradient — emerald top-left, gold top-right, teal bottom */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,hsl(var(--primary)/0.22),transparent_55%),radial-gradient(ellipse_60%_50%_at_100%_5%,#ffd21f33,transparent_50%),radial-gradient(ellipse_70%_55%_at_50%_100%,hsl(var(--primary)/0.14),transparent_55%)]" />

      {/* Animated blob — emerald, start side */}
      <motion.div
        className="absolute -start-20 top-10 h-80 w-80 rounded-full bg-primary/25 blur-[72px]"
        animate={
          reduceMotion ? undefined : { scale: [1, 1.12, 1], opacity: [0.6, 0.85, 0.6] }
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Animated blob — gold, end side */}
      <motion.div
        className="absolute -end-16 top-20 h-64 w-64 rounded-full blur-[60px]"
        style={{ backgroundColor: "#ffd21f55" }}
        animate={
          reduceMotion ? undefined : { y: [0, 14, 0], opacity: [0.55, 0.8, 0.55] }
        }
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />

      {/* Animated blob — teal, bottom-end */}
      <motion.div
        className="absolute -end-24 bottom-16 h-72 w-72 rounded-full bg-primary/18 blur-[80px]"
        animate={
          reduceMotion ? undefined : { scale: [1, 1.1, 1], opacity: [0.45, 0.7, 0.45] }
        }
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />

      {/* Animated blob — gold accent, bottom-start */}
      <motion.div
        className="absolute -start-10 bottom-24 h-56 w-56 rounded-full blur-[56px]"
        style={{ backgroundColor: "#ffd21f40" }}
        animate={
          reduceMotion ? undefined : { y: [0, -10, 0], opacity: [0.4, 0.6, 0.4] }
        }
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2.5 }}
      />

      <div className={bottomFade} />
    </div>
  );
});
