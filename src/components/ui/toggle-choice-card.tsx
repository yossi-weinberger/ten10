import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GoldenBubbles } from "@/components/ui/golden-bubbles";
import { cn } from "@/lib/utils";

export type ToggleChoiceCardVariant = "primary" | "golden" | "danger" | "success";

export interface ToggleChoiceCardProps {
  selected: boolean;
  variant: ToggleChoiceCardVariant;
  /** When false, golden variant keeps colors but skips GoldenBubbles burst (e.g. opening balance). Default true. */
  showGoldenBubbles?: boolean;
  tooltip?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Same “card toggle” look as TransactionCheckboxes (motion, shadow, optional golden chrome).
 * Use inside <Label htmlFor="..."> or as clickable surface; parent handles input/radio.
 */
export function ToggleChoiceCard({
  selected,
  variant,
  showGoldenBubbles = true,
  tooltip,
  children,
  className,
}: ToggleChoiceCardProps) {
  const { i18n } = useTranslation();
  const isGolden = variant === "golden";
  const [shineKey, setShineKey] = useState(0);
  const [bubblesKey, setBubblesKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const checkedClasses = (() => {
    switch (variant) {
      case "primary":
        return "bg-primary text-primary-foreground border-primary";
      case "golden":
        return "bg-golden-static text-yellow-950 border-yellow-700";
      case "danger":
        return "bg-red-50 text-red-900 border-red-600 dark:bg-red-950/50 dark:text-red-400 dark:border-red-600";
      case "success":
        return "bg-green-50 text-green-900 border-green-600 dark:bg-green-950/50 dark:text-green-400 dark:border-green-600";
      default:
        return "bg-card text-card-foreground border-border";
    }
  })();

  return (
    <motion.div
      key={
        isGolden && selected && showGoldenBubbles ? `golden-${bubblesKey}` : undefined
      }
      onClick={() => {
        if (isGolden) {
          setShineKey((k) => k + 1);
          if (showGoldenBubbles) setBubblesKey((k) => k + 1);
        }
      }}
      onMouseEnter={() => {
        if (isGolden) {
          setShineKey((k) => k + 1);
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (isGolden) setIsHovered(false);
      }}
      initial={false}
      animate={selected ? "checked" : "unchecked"}
      whileHover="hover"
      whileTap="pressed"
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
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 1,
      }}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border p-2 cursor-pointer select-none min-h-[4rem] w-full group",
        selected
          ? checkedClasses
          : isGolden && isHovered
            ? "bg-golden-hover text-yellow-900 border-yellow-600"
            : "bg-card text-card-foreground border-border",
        className,
      )}
      style={{ overflow: "visible" }}
    >
      {isGolden && !selected && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl">
          <motion.div
            key={shineKey}
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: "100%", opacity: [0, 0.4, 0] }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            style={{
              width: "50%",
              height: "100%",
              transform: "skewX(-20deg)",
            }}
          />
        </div>
      )}

      {isGolden && selected && showGoldenBubbles && (
        <GoldenBubbles key={bubblesKey} active={true} />
      )}

      {tooltip ? (
        <div className="absolute top-1.5 start-2 z-20" style={{ overflow: "visible" }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className={cn(
                  "h-4 w-4 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors",
                  selected
                    ? variant === "golden"
                      ? "text-yellow-900/70 hover:text-yellow-950"
                      : variant === "primary"
                        ? "text-primary-foreground/70 hover:text-primary-foreground"
                        : variant === "danger"
                          ? "text-red-900/70 hover:text-red-950"
                          : "text-green-900/70 hover:text-green-950"
                    : "text-muted-foreground/70 hover:text-foreground",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="z-[9999] max-w-xs">
              <p className="text-sm" dir={i18n.dir()}>
                {tooltip}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      <span className="text-base font-semibold text-center leading-tight px-1 select-none z-10 relative">
        {children}
      </span>
    </motion.div>
  );
}
