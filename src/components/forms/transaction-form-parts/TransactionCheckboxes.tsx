import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { motion } from "framer-motion";
import { FormField, FormItem, FormControl } from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import type { TransactionFormValues } from "@/lib/schemas";
import { TransactionType } from "@/types/transaction";
import { cn } from "@/lib/utils";
import { SparkleBurst } from "@/components/ui/sparkle-burst";

interface TransactionCheckboxesProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedType: TransactionType;
  isExemptChecked?: boolean;
}

export function TransactionCheckboxes({
  form,
  selectedType,
  isExemptChecked,
}: TransactionCheckboxesProps) {
  const { t } = useTranslation("transactions");
  const isChomeshChecked = form.watch("is_chomesh");

  const renderToggleButton = (
    name: keyof TransactionFormValues,
    labelKey: string,
    tooltipKey: string,
    isDisabled: boolean = false,
    onToggleOverride?: (
      currentValue: boolean,
      onChange: (val: boolean) => void
    ) => void,
    isGolden: boolean = false
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        // Ensure boolean value for type safety
        const isChecked = !!field.value;

        return (
          <FormItem className="flex-1 min-w-[100px] max-w-[160px]">
            <FormControl>
              <motion.div
                onClick={() => {
                  if (isDisabled) return;
                  if (onToggleOverride) {
                    onToggleOverride(isChecked, field.onChange);
                  } else {
                    field.onChange(!isChecked);
                  }
                }}
                initial={false}
                animate={
                  isDisabled ? "disabled" : isChecked ? "checked" : "unchecked"
                }
                whileHover={!isDisabled ? "hover" : undefined}
                whileTap={!isDisabled ? "pressed" : undefined}
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
                  "relative flex flex-col items-center justify-center rounded-xl p-2 border cursor-pointer select-none h-24 group",
                  // Colors handled via className for theme support
                  isChecked
                    ? isGolden
                      ? "bg-[conic-gradient(from_45deg_at_50%_50%,#FFD700_0%,#FDB931_25%,#FFFACD_50%,#FDB931_75%,#FFD700_100%)] text-yellow-950 border-yellow-600 bg-[length:200%_200%] animate-gradient-xy" // Metallic Golden state
                      : "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-card-foreground border-border",
                  isDisabled &&
                    "cursor-not-allowed bg-muted text-muted-foreground border-border"
                )}
              >
                {/* Clipping Container for Background Effects Only */}
                <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                  {/* Metallic Shine Effect on Hover (CSS-based) */}
                  {!isDisabled && (
                    <div className="absolute inset-0 -translate-x-[150%] -translate-y-[150%] group-hover:animate-shine z-10 pointer-events-none">
                      <div className="w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/30 to-transparent -rotate-45 blur-sm" />
                    </div>
                  )}

                  {/* Shine Effect Container - kept for golden state looping shine */}
                  {isChecked && isGolden && (
                    <div className="absolute inset-0 pointer-events-none z-0">
                      <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: "100%", opacity: 0.3 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          repeatDelay: 3,
                          ease: "easeInOut",
                        }}
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12"
                      />
                    </div>
                  )}
                </div>

                {/* Sparkle Animation (Unclipped, Single Burst) - OUTSIDE overflow-hidden */}
                {isGolden && <SparkleBurst active={isChecked} />}

                {/* Tooltip Icon - Top Corner */}
                <div className="absolute top-1.5 left-2 z-20">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-4 w-4 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors",
                          isChecked
                            ? isGolden
                              ? "text-yellow-900/70 hover:text-yellow-950"
                              : "text-primary-foreground/70 hover:text-primary-foreground"
                            : "text-muted-foreground/70 hover:text-foreground"
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
                    <TooltipContent side="top">
                      <p className="max-w-xs text-sm">{t(tooltipKey)}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Label - Centered */}
                <span className="text-xs font-medium text-center leading-tight px-1 select-none z-10 relative">
                  {t(labelKey)}
                </span>
              </motion.div>
            </FormControl>
          </FormItem>
        );
      }}
    />
  );

  return (
    <div className="flex flex-row flex-wrap gap-3 mt-2 w-full justify-center">
      {selectedType === "income" && (
        <>
          {/* Exempt Income */}
          {renderToggleButton(
            "isExempt",
            "transactionForm.exemptIncome.label",
            "transactionForm.exemptIncome.tooltip",
            !!isChomeshChecked,
            (isChecked, onChange) => {
              if (isChomeshChecked) return;
              onChange(!isChecked);
            }
          )}

          {/* Chomesh */}
          {renderToggleButton(
            "is_chomesh",
            "transactionForm.chomesh.label",
            "transactionForm.chomesh.tooltip",
            !!isExemptChecked,
            (isChecked, onChange) => {
              if (isExemptChecked) return;
              onChange(!isChecked);
            },
            true // Activate golden mode for Chomesh
          )}
        </>
      )}

      {selectedType === "expense" &&
        renderToggleButton(
          "isRecognized",
          "transactionForm.recognizedExpense.label",
          "transactionForm.recognizedExpense.tooltip"
        )}

      {selectedType === "donation" &&
        renderToggleButton(
          "isFromPersonalFunds",
          "transactionForm.personalFunds.label",
          "transactionForm.personalFunds.tooltip"
        )}

      {/* Recurring Transaction - Always Visible */}
      {renderToggleButton(
        "is_recurring",
        "transactionForm.recurringTransaction.isRecurring",
        "transactionForm.recurringTransaction.tooltip"
      )}
    </div>
  );
}
