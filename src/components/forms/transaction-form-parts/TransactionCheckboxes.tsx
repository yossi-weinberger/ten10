import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { FormField } from "@/components/ui/form"; // Only FormField might be needed directly if others are wrapped
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import type { TransactionFormValues } from "@/lib/schemas";
import { TransactionType } from "@/types/transaction"; // Import TransactionType

interface TransactionCheckboxesProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedType: TransactionType;
  isExemptChecked?: boolean; // Optional as it's only relevant for income
}

export function TransactionCheckboxes({
  form,
  selectedType,
  isExemptChecked,
}: TransactionCheckboxesProps) {
  const { t } = useTranslation("transactions");
  return (
    <TooltipProvider>
      <div className="flex flex-row flex-wrap gap-4 mt-2 w-full">
        {selectedType === "income" && (
          <>
            {/* הכנסה פטורה ממעשר */}
            <div className="flex-1 flex flex-col items-center justify-start rounded-lg p-3 shadow-sm min-w-[120px] border border-border min-h-[100px]">
              <div className="flex items-center justify-center mb-2 text-center">
                <span className="text-xs font-medium">
                  {t("transactionForm.exemptIncome.label")}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="max-w-xs text-sm">
                      {t("transactionForm.exemptIncome.tooltip")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <FormField
                control={form.control}
                name="isExempt"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="size-6 rounded border mt-auto"
                  />
                )}
              />
            </div>
            {/* חומש */}
            <div className="flex-1 flex flex-col items-center justify-start rounded-lg p-3 shadow-sm min-w-[120px] border border-border min-h-[100px]">
              <div className="flex items-center justify-center mb-2 text-center">
                <span className="text-xs font-medium">
                  {t("transactionForm.chomesh.label")}
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                    >
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="max-w-xs text-sm">
                      {t("transactionForm.chomesh.tooltip")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <FormField
                control={form.control}
                name="is_chomesh"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => {
                      if (isExemptChecked) return;
                      field.onChange(checked);
                    }}
                    disabled={isExemptChecked}
                    className="size-6 rounded border mt-auto"
                  />
                )}
              />
            </div>
          </>
        )}
        {selectedType === "expense" && (
          <div className="flex-1 flex flex-col items-center justify-start rounded-lg p-3 shadow-sm min-w-[120px] border border-border min-h-[100px]">
            <div className="flex items-center justify-center mb-2 text-center">
              <span className="text-xs font-medium">
                {t("transactionForm.recognizedExpense.label")}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="max-w-xs text-sm">
                    {t("transactionForm.recognizedExpense.tooltip")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <FormField
              control={form.control}
              name="isRecognized"
              render={({ field }) => (
                <Checkbox
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  className="size-6 rounded border mt-auto"
                />
              )}
            />
          </div>
        )}
        {selectedType === "donation" && (
          <div className="flex-1 flex flex-col items-center justify-start rounded-lg p-3 shadow-sm min-w-[120px] border border-border min-h-[100px]">
            <div className="flex items-center justify-center mb-2 text-center">
              <span className="text-xs font-medium">
                {t("transactionForm.personalFunds.label")}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="max-w-xs text-sm">
                    {t("transactionForm.personalFunds.tooltip")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <FormField
              control={form.control}
              name="isFromPersonalFunds" // Bind to the new form field
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-6 rounded border mt-auto"
                />
              )}
            />
          </div>
        )}
        {/* הוראת קבע - should always be visible */}
        <div className="flex-1 flex flex-col items-center justify-start rounded-lg p-3 shadow-sm min-w-[120px] border border-border min-h-[100px]">
          <div className="flex items-center justify-center mb-2 text-center">
            <span className="text-xs font-medium">
              {t("transactionForm.recurringTransaction.isRecurring")}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 ml-1 p-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="max-w-xs text-sm">
                  {t("transactionForm.recurringTransaction.tooltip")}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <FormField
            control={form.control}
            name="is_recurring"
            render={({ field }) => (
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
                className="size-6 rounded border mt-auto"
              />
            )}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}
