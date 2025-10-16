import { useInView } from "framer-motion";
import { useRef } from "react";

interface UseScrollAnimationOptions {
  threshold?: number;
  triggerOnce?: boolean;
  margin?: string;
}

export function useScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const {
    threshold = 0.1,
    triggerOnce = true,
    margin = "0px 0px -100px 0px",
  } = options;

  const ref = useRef(null);
  const isInView = useInView(ref, {
    threshold,
    once: triggerOnce,
    margin,
  });

  return { ref, isInView };
}

// Animation variants for common patterns
export const fadeInUp = {
  hidden: {
    opacity: 0,
    y: 60,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
      duration: 0.6,
    },
  },
};

export const fadeInLeft = {
  hidden: {
    opacity: 0,
    x: -60,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
    },
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
      duration: 0.6,
    },
  },
};

export const fadeInRight = {
  hidden: {
    opacity: 0,
    x: 60,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
    },
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
      duration: 0.6,
    },
  },
};

export const scaleIn = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
    },
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
      duration: 0.6,
    },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  hidden: {
    opacity: 0,
    y: 30,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 100,
    },
  },
};

// Hover animations
export const hoverScale = {
  scale: 1.05,
  transition: {
    type: "spring" as const,
    damping: 20,
    stiffness: 300,
  },
};

export const hoverLift = {
  y: -8,
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
  transition: {
    type: "spring" as const,
    damping: 20,
    stiffness: 300,
  },
};

// Button animations - standardized
export const buttonTap = {
  scale: 0.95,
  transition: {
    type: "spring" as const,
    damping: 20,
    stiffness: 400,
  },
};

export const buttonHover = {
  y: -2,
  transition: {
    type: "spring" as const,
    damping: 20,
    stiffness: 400,
  },
};
