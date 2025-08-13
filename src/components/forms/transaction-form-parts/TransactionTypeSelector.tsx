import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormLabel } from "@/components/ui/form";
import { Wallet, CreditCard, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionType } from "@/types/transaction";
import type { TransactionFormValues } from "@/lib/schemas";

const userFacingTransactionTypes: TransactionType[] = [
  "income",
  "expense",
  "donation",
];
type ButtonStyleType = "income" | "expense" | "donation";

// Only the slider changes color; the triggers themselves remain transparent
const indicatorColors: Record<ButtonStyleType, string> = {
  income: "bg-green-100 dark:bg-green-900",
  expense: "bg-red-100 dark:bg-red-900",
  donation: "bg-yellow-100 dark:bg-yellow-900",
};

interface TransactionTypeSelectorProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedType: TransactionType;
}

export function TransactionTypeSelector({
  form,
  selectedType,
}: TransactionTypeSelectorProps) {
  const { t } = useTranslation("transactions");

  const transactionTypeLabels: Record<TransactionType, string> = {
    income: t("transactionForm.transactionType.income"),
    donation: t("transactionForm.transactionType.donation"),
    expense: t("transactionForm.transactionType.expense"),
    "exempt-income": t("transactionForm.transactionType.exempt-income"),
    "recognized-expense": t(
      "transactionForm.transactionType.recognized-expense"
    ),
    non_tithe_donation: t("transactionForm.transactionType.non_tithe_donation"),
  };

  const displayTypes = userFacingTransactionTypes
    .slice()
    .reverse() as ButtonStyleType[];
  const index = Math.max(
    0,
    displayTypes.indexOf(selectedType as ButtonStyleType)
  );
  const sliderColor = indicatorColors[selectedType as ButtonStyleType];

  return (
    <div className="space-y-2">
      <FormLabel className="text-base font-medium">
        {t("transactionForm.transactionType.label")}
      </FormLabel>

      <Tabs
        value={selectedType}
        onValueChange={(value) =>
          form.setValue("type", value as TransactionType, {
            shouldValidate: true,
          })
        }
        className="w-full"
      >
        <TabsList
          className={cn(
            "relative grid w-full grid-cols-3 gap-0 mt-2 p-1 h-auto",
            "bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden"
          )}
        >
          {/* The single slider that provides the highlight */}
          <div
            className={cn(
              "pointer-events-none absolute top-1 bottom-1 left-1 rounded-md shadow-sm",
              "transition-[transform,background-color] duration-500 ease-in-out",
              "will-change-transform",
              sliderColor
            )}
            style={{
              // Width is one third of the inner width after padding (p-1 = 0.25rem each side)
              width: "calc((100% - 0.5rem) / 3)",
              // Move by its own width; won't overflow on the right edge
              transform: `translateX(calc(${index} * 100%))`,
            }}
            aria-hidden
          />

          {displayTypes.map((type) => (
            <TabsTrigger
              key={type}
              value={type}
              className={cn(
                // Layer above the slider
                "relative z-10",
                // Layout
                "flex flex-col items-center justify-center h-auto py-2 px-1 md:py-3 md:px-2",
                "text-center rounded-md",
                // Fully transparent in all states
                "bg-transparent border-0",
                "hover:bg-transparent data-[state=active]:bg-transparent",
                "data-[state=active]:border-0",
                // Fixed text color (can be customized)
                "text-foreground",
                // Subtle focus without a heavy ring
                "focus-visible:ring-0 focus-visible:outline-none"
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
    </div>
  );
}
