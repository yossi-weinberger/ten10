import React from "react";
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
import type { TransactionFormValues } from "../TransactionForm"; // Adjust path as needed
import { TransactionType } from "@/types/transaction"; // Import TransactionType

interface TransactionCheckboxesProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedType: TransactionType;
  isExemptChecked?: boolean; // Optional as it's only relevant for income
  isFromPersonalFundsChecked?: boolean; // New prop for the new checkbox
}

export function TransactionCheckboxes({
  form,
  selectedType,
  isExemptChecked,
  isFromPersonalFundsChecked, // Destructure new prop
}: TransactionCheckboxesProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-row flex-wrap gap-4 mt-2 w-full">
        {selectedType === "income" && (
          <>
            {/* הכנסה פטורה ממעשר */}
            <div className="flex-1 flex flex-col items-center justify-start rounded-lg p-3 shadow-sm min-w-[120px] border border-border min-h-[100px]">
              <div className="flex items-center justify-center mb-2 text-center">
                <span className="text-xs font-medium">הכנסה פטורה ממעשר?</span>
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
                      יש לסמן אם הכנסה זו אינה חייבת כלל במעשר (למשל, מתנה
                      מסויימת, החזר הוצאה).
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
                <span className="text-xs font-medium">לחשב חומש (20%)?</span>
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
                      יש לסמן אם ההכנסה דורשת הפרשת 20% במקום 10%.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <FormField
                control={form.control}
                name="is_chomesh"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
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
              <span className="text-xs font-medium">הוצאה מוכרת?</span>
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
                    יש לסמן אם זו הוצאה המוכרת לניכוי מהכנסות החייבות במעשר (10%
                    מההוצאה ינוכה מהחוב).
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <FormField
              control={form.control}
              name="isRecognized"
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
        {selectedType === "donation" && (
          <div className="flex-1 flex flex-col items-center justify-start rounded-lg p-3 shadow-sm min-w-[120px] border border-border min-h-[100px]">
            <div className="flex items-center justify-center mb-2 text-center">
              <span className="text-xs font-medium">תרומה מכספים אישיים?</span>
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
                    יש לסמן אם תרומה זו ניתנת מכספים אישיים ואינה אמורה לרדת
                    מיתרת המעשר.
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
            <span className="text-xs font-medium">הוראת קבע</span>
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
                  סמן אם זוהי טרנזקציה שחוזרת באופן קבוע.
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
