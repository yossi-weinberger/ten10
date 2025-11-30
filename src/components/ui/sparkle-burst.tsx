import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import React from "react";

interface SparkleBurstProps {
  active: boolean;
  count?: number;
  className?: string;
}

export const SparkleBurst: React.FC<SparkleBurstProps> = ({
  active,
  count = 12,
  className,
}) => {
  return (
    <AnimatePresence>
      {active && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
          {[...Array(count)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [1, 1, 0], // Keep opacity 1 for longer
                scale: [0, 1.2, 0],
                x: (Math.random() - 0.5) * 200, // Wider spread
                y: (Math.random() - 0.5) * 200,
                rotate: Math.random() * 180,
              }}
              transition={{
                duration: 0.8,
                ease: "easeOut",
                delay: Math.random() * 0.1,
              }}
              className="absolute"
            >
              <Sparkles
                className="text-yellow-400 fill-yellow-400 drop-shadow-lg" // Added fill and improved shadow
                style={{
                  width: Math.random() * 12 + 12 + "px", // Slightly larger
                  height: Math.random() * 12 + 12 + "px",
                  filter: "drop-shadow(0 0 2px rgba(255, 215, 0, 0.8))", // Glow effect
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};
