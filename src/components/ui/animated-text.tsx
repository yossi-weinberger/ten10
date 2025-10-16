import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedTextProps {
  children: ReactNode;
  className?: string;
  variant?: "typewriter" | "fadeInWords" | "slideInChars" | "reveal";
  delay?: number;
  duration?: number;
}

export function AnimatedText({
  children,
  className = "",
  variant = "fadeInWords",
  delay = 0,
  duration = 0.8,
}: AnimatedTextProps) {
  const text = typeof children === "string" ? children : "";

  if (variant === "typewriter" && text) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ delay }}
      >
        <motion.span
          initial={{ width: 0 }}
          animate={{ width: "auto" }}
          transition={{
            duration: duration,
            delay: delay,
            ease: "easeInOut",
          }}
          style={{
            display: "inline-block",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </motion.span>
        <motion.span
          className="inline-block w-0.5 h-6 bg-current ml-1"
          animate={{ opacity: [1, 0, 1] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: delay + duration,
          }}
        />
      </motion.div>
    );
  }

  if (variant === "fadeInWords" && text) {
    const words = text.split(" ");
    return (
      <motion.div
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
              delayChildren: delay,
            },
          },
        }}
      >
        {words.map((word, index) => (
          <motion.span
            key={index}
            className="inline-block mr-2"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  type: "spring" as const,
                  damping: 20,
                  stiffness: 100,
                },
              },
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.div>
    );
  }

  if (variant === "slideInChars" && text) {
    const chars = text.split("");
    return (
      <motion.div
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.03,
              delayChildren: delay,
            },
          },
        }}
      >
        {chars.map((char, index) => (
          <motion.span
            key={index}
            className="inline-block"
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: {
                opacity: 1,
                x: 0,
                transition: {
                  type: "spring" as const,
                  damping: 20,
                  stiffness: 200,
                },
              },
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.div>
    );
  }

  if (variant === "reveal") {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          transition={{
            duration: duration,
            delay: delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        >
          {children}
        </motion.div>
        <motion.div
          className="absolute inset-0 bg-blue-600"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{
            duration: duration * 0.8,
            delay: delay + 0.1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      </div>
    );
  }

  // Default fallback
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: duration,
        delay: delay,
        type: "spring" as const,
        damping: 20,
        stiffness: 100,
      }}
    >
      {children}
    </motion.div>
  );
}

// Specialized components for common use cases
export function TypewriterText({
  children,
  className = "",
  delay = 0,
  duration = 1.5,
}: Omit<AnimatedTextProps, "variant">) {
  return (
    <AnimatedText
      variant="typewriter"
      className={className}
      delay={delay}
      duration={duration}
    >
      {children}
    </AnimatedText>
  );
}

export function FadeInWords({
  children,
  className = "",
  delay = 0,
}: Omit<AnimatedTextProps, "variant" | "duration">) {
  return (
    <AnimatedText variant="fadeInWords" className={className} delay={delay}>
      {children}
    </AnimatedText>
  );
}

export function RevealText({
  children,
  className = "",
  delay = 0,
  duration = 0.8,
}: Omit<AnimatedTextProps, "variant">) {
  return (
    <AnimatedText
      variant="reveal"
      className={className}
      delay={delay}
      duration={duration}
    >
      {children}
    </AnimatedText>
  );
}
