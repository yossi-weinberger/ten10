import React from "react";
import { cn } from "@/lib/utils";
import "./golden-bubbles.css";

interface GoldenBubblesProps {
  active: boolean;
  className?: string;
}

/**
 * Golden bubbles animation effect component
 * Creates a bubble burst effect with golden colors that animates once when triggered
 */
export const GoldenBubbles: React.FC<GoldenBubblesProps> = ({
  active,
  className,
}) => {
  if (!active) return null;

  return <div className={cn("golden-bubbles-effect", className)} />;
};
