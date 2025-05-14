import React from "react";
import { UseFormReturn } from "react-hook-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormLabel } from "@/components/ui/form";
import { Wallet, CreditCard, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionType } from "@/types/transaction";
import type { TransactionFormValues } from "../TransactionForm";

// Define user-facing types to show in the dropdown
const userFacingTransactionTypes: TransactionType[] = [
  "income",
  "expense",
  "donation",
];

// Hebrew labels for transaction types
const transactionTypeLabels: Record<TransactionType, string> = {
  income: "הכנסה",
  donation: "תרומה",
  expense: "הוצאה",
  "exempt-income": "הכנסה פטורה", // Not currently in userFacing, but kept for completeness if needed later
  "recognized-expense": "הוצאה מוכרת", // Not currently in userFacing, but kept for completeness if needed later
};

// Define explicit type for button styles
type ButtonStyleType = "income" | "expense" | "donation";

// Define active button styles object
const activeButtonStyles: Record<ButtonStyleType, string> = {
  income:
    "data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-900 border-green-300 dark:border-green-700 text-green-800 dark:text-green-100",
  expense:
    "data-[state=active]:bg-red-100 dark:data-[state=active]:bg-red-900 border-red-300 dark:border-red-700 text-red-800 dark:text-red-100",
  donation:
    "data-[state=active]:bg-yellow-100 dark:data-[state=active]:bg-yellow-900 border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-100",
};

interface TransactionTypeSelectorProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedType: TransactionType; // Keep selectedType as it's dynamic
  // Removed userFacingTransactionTypes, transactionTypeLabels, activeButtonStyles from props
}

export function TransactionTypeSelector({
  form,
  selectedType,
}: TransactionTypeSelectorProps) {
  return (
    <Tabs
      value={selectedType}
      onValueChange={(value) => {
        form.setValue("type", value as TransactionType, {
          shouldValidate: true,
        });
      }}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-3 gap-1 md:gap-2 mt-2 p-1 h-auto bg-gray-200 dark:bg-gray-800 rounded-lg">
        {(
          userFacingTransactionTypes.slice().reverse() as ButtonStyleType[]
        ).map((type) => (
          <TabsTrigger
            key={type}
            value={type}
            className={cn(
              "flex flex-col items-center justify-center h-auto py-2 px-1 md:py-3 md:px-2 text-center transition-all duration-150 rounded-md data-[state=active]:shadow-md",
              selectedType === type
                ? activeButtonStyles[type as ButtonStyleType]
                : "bg-transparent hover:bg-accent hover:text-accent-foreground text-foreground"
            )}
          >
            {type === "income" && <Wallet className="h-5 w-5 mb-1 mx-auto" />}
            {type === "expense" && (
              <CreditCard className="h-5 w-5 mb-1 mx-auto" />
            )}
            {type === "donation" && (
              <HandCoins className="h-5 w-5 mb-1 mx-auto" />
            )}
            <span className="text-xs md:text-sm">
              {transactionTypeLabels[type as TransactionType]}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {form.formState.errors.type && (
        <p className="text-sm font-medium text-destructive mt-1">
          {form.formState.errors.type.message}
        </p>
      )}
    </Tabs>
  );
}
