import { motion, Variants } from "framer-motion";
import { useState, type Ref } from "react";
import {
  LOGO_FILE_COLORS,
  LOGO_LETTERS,
  LOGO_ZERO_CENTER,
  SYMBOL_RING_PATH,
  SYMBOL_SLICE_PATH,
  WIDE_LOGO_VIEWBOX,
} from "@/components/brand/logoPaths";

const EASING = [0.4, 0, 0.2, 1] as const;
const DURATION = 1.1;

const emeraldVariants: Variants = {
  idle:  { pathLength: 0, strokeOpacity: 0 },
  hover: {
    pathLength: 1,
    strokeOpacity: 1,
    transition: {
      pathLength: { duration: DURATION, ease: EASING },
      strokeOpacity: { duration: 0.05 },
    },
  },
};

const goldVariants: Variants = {
  idle:  { pathLength: 0, strokeOpacity: 0 },
  hover: {
    pathLength: 1,
    strokeOpacity: 1,
    transition: {
      pathLength: { duration: DURATION * 0.7, ease: EASING },
      strokeOpacity: { duration: 0.05 },
    },
  },
};

const { teal: EMERALD, gold: GOLD } = LOGO_FILE_COLORS;

interface AnimatedLogoProps {
  /** The glass card, for the scroll-linked logo dock (`LandingLogoDock`). */
  cardRef?: Ref<HTMLDivElement>;
  /** The logo's SVG, for the scroll-linked logo dock (`LandingLogoDock`). */
  svgRef?: Ref<SVGSVGElement>;
}

/** The wide logo in a glass card; hovering draws its outlines. Paths from `logoPaths.ts`. */
export const AnimatedLogo = ({ cardRef, svgRef }: AnimatedLogoProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const animate = isHovered ? "hover" : "idle";

  return (
    <motion.div
      ref={cardRef}
      className="inline-flex max-w-[calc(100vw-2rem)] items-center justify-center rounded-2xl border border-border/50 bg-card/70 p-2 shadow-lg backdrop-blur-md sm:p-4"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={WIDE_LOGO_VIEWBOX.join(" ")}
        className="h-auto w-[min(18rem,calc(100vw-4rem))] sm:w-[22rem]"
      >
        {/* Letters T, E, N and the number 1 */}
        {LOGO_LETTERS.map((letter) => (
          <motion.path
            key={letter.key}
            d={letter.path}
            fill={EMERALD}
            stroke={EMERALD}
            strokeWidth="3"
            variants={emeraldVariants}
            initial="idle"
            animate={animate}
          />
        ))}

        {/* The 0 and its gold slice, drawn around the ring's centre */}
        <g transform={`translate(${LOGO_ZERO_CENTER.wide[0]} ${LOGO_ZERO_CENTER.wide[1]})`}>
          <motion.path
            d={SYMBOL_RING_PATH}
            fill={EMERALD}
            stroke={EMERALD}
            strokeWidth="3"
            variants={emeraldVariants}
            initial="idle"
            animate={animate}
          />
          <motion.path
            d={SYMBOL_SLICE_PATH}
            fill={GOLD}
            stroke={GOLD}
            strokeWidth="3"
            variants={goldVariants}
            initial="idle"
            animate={animate}
          />
        </g>
      </svg>
    </motion.div>
  );
};
