import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GoldenBubbles } from "@/components/ui/golden-bubbles";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";

export interface FlagToggleButtonProps {
  checked: boolean;
  label: string;
  tooltip: string;
  disabled?: boolean;
  isGolden?: boolean;
  className?: string;
  onToggle: () => void;
}

export function FlagToggleButton({
  checked,
  label,
  tooltip,
  disabled = false,
  isGolden = false,
  className,
  onToggle,
}: FlagToggleButtonProps) {
  // Track if shine animation should trigger (only once per hover/click)
  const [shineKey, setShineKey] = useState(0);
  // Track hover state for golden button
  const [isHovered, setIsHovered] = useState(false);
  // Track if bubbles animation should trigger (only on click)
  const [bubblesKey, setBubblesKey] = useState(0);

  useEffect(() => {
    if (!checked) {
      setIsHovered(false);
    }
  }, [checked]);

  return (
    <motion.div
      key={isGolden && checked ? `golden-${bubblesKey}` : undefined}
      onClick={() => {
        if (disabled) return;
        // Trigger shine and bubbles animations on click (for golden button)
        if (isGolden) {
          setShineKey((prev) => prev + 1);
          setBubblesKey((prev) => prev + 1);
        }
        onToggle();
      }}
      onMouseEnter={() => {
        // Trigger shine animation on hover (for golden button)
        if (isGolden && !disabled) {
          setShineKey((prev) => prev + 1);
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (isGolden && !disabled) {
          setIsHovered(false);
        }
      }}
      initial={false}
      animate={disabled ? "disabled" : checked ? "checked" : "unchecked"}
      whileHover={!disabled ? "hover" : undefined}
      whileTap={!disabled ? "pressed" : undefined}
      variants={{
        unchecked: {
          y: 0,
          scale: 1,
          opacity: 1,
          boxShadow:
            "0px 4px 0px 0px hsl(var(--muted-foreground)/0.2), 0px 6px 8px -1px rgba(0,0,0,0.1)",
        },
        hover: {
          y: -2,
          scale: 1,
          opacity: 1,
          boxShadow:
            "0px 5px 0px 0px hsl(var(--muted-foreground)/0.2), 0px 8px 12px -1px rgba(0,0,0,0.15)",
        },
        pressed: {
          y: 4,
          scale: 0.98,
          opacity: 1,
          boxShadow: "0px 0px 0px 0px transparent",
        },
        checked: {
          y: 4,
          scale: 1,
          opacity: 1,
          boxShadow: "inset 0px 2px 4px 0px rgba(0,0,0,0.1)",
        },
        disabled: {
          y: 0,
          scale: 1,
          opacity: 0.6,
          boxShadow: "0px 0px 0px 0px transparent",
        },
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
      }}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl p-2 border cursor-pointer select-none h-16 group",
        // Colors handled via className for theme support
        checked
          ? isGolden
            ? "bg-golden-static text-yellow-950 border-yellow-700" // Static golden gradient
            : "bg-primary text-primary-foreground border-primary"
          : isGolden && !disabled && isHovered
            ? "bg-golden-hover text-yellow-900 border-yellow-600" // Golden hover state for better shine visibility
            : "bg-card text-card-foreground border-border",
        disabled &&
          "cursor-not-allowed bg-muted text-muted-foreground border-border",
        className,
      )}
      style={{ overflow: "visible" }}
    >
      {/* Shine Effect - runs once on hover or click */}
      {!disabled && isGolden && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl">
          <motion.div
            key={shineKey}
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "100%", opacity: [0, 0.4, 0] }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            style={{
              width: "50%",
              height: "100%",
              transform: "skewX(-20deg)",
            }}
          />
        </div>
      )}

      {/* Golden Bubbles Animation - only on click */}
      {isGolden && checked && (
        <GoldenBubbles key={bubblesKey} active={true} />
      )}

      {/* Tooltip Icon - Top Corner */}
      <div
        className="absolute top-1.5 left-2 z-20"
        style={{ overflow: "visible" }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-4 w-4 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors",
                checked
                  ? isGolden
                    ? "text-yellow-900/70 hover:text-yellow-950"
                    : "text-primary-foreground/70 hover:text-primary-foreground"
                  : "text-muted-foreground/70 hover:text-foreground",
              )}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              type="button"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="z-[9999]">
            <p className="max-w-xs text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Label - Centered */}
      <span className="text-xs font-medium text-center leading-tight px-1 select-none z-10 relative">
        {label}
      </span>
    </motion.div>
  );
}
