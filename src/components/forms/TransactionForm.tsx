import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDonationStore } from "@/lib/store";
import { handleTransactionSubmit } from "@/lib/data-layer/transactionForm.service";
import { TransactionFormValues, transactionFormSchema } from "@/types/forms";
import { TransactionType } from "@/types/transaction";
import { Form } from "@/components/ui/form";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionTypeSelector } from "./transaction-form-parts/TransactionTypeSelector";
import { AmountCurrencyDateFields } from "./transaction-form-parts/AmountCurrencyDateFields";
import { DescriptionCategoryFields } from "./transaction-form-parts/DescriptionCategoryFields";
import { TransactionCheckboxes } from "./transaction-form-parts/TransactionCheckboxes";
import { RecurringFields } from "./transaction-form-parts/RecurringFields";
import { FormActionButtons } from "./transaction-form-parts/FormActionButtons";

// Hebrew labels for transaction types
const transactionTypeLabels: Record<TransactionType, string> = {
  income: "הכנסה",
  donation: "תרומה",
  expense: "הוצאה",
  "exempt-income": "הכנסה פטורה", // For future use
  "recognized-expense": "הוצאה מוכרת", // For future use
  non_tithe_donation: "תרומה שאינה ממעשר", // Renamed label
};

// Zod schema is now imported from "@/types/forms"

// TODO: Use discriminatedUnion or refine schema for conditional requirements:
// - is_chomesh: required if type is 'income'
// - recipient: required if type is 'donation'
// - category: perhaps more relevant for 'expense'/'recognized-expense'

interface TransactionFormProps {
  // initialData?: Transaction; // For editing later
  onSubmitSuccess?: () => void; // Callback after successful submission
  onCancel?: () => void; // Callback for cancel action
}

const backgroundStyles: Record<TransactionType, string> = {
  income: "bg-green-50 dark:bg-green-950",
  expense: "bg-red-50 dark:bg-red-950",
  donation: "bg-yellow-50 dark:bg-yellow-950",
  "exempt-income": "bg-green-50 dark:bg-green-950",
  "recognized-expense": "bg-red-50 dark:bg-red-950",
  non_tithe_donation: "bg-yellow-50 dark:bg-yellow-950", // Renamed, kept style same as donation
};

export function TransactionForm({
  onSubmitSuccess,
  onCancel,
}: TransactionFormProps) {
  const storedDefaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );

  // The form schema only allows these currencies.
  const validCurrencies: Array<TransactionFormValues["currency"]> = [
    "ILS",
    "USD",
    "EUR",
  ];

  // If the stored currency isn't one of the valid ones, default to ILS.
  const defaultCurrency = validCurrencies.includes(
    storedDefaultCurrency as (typeof validCurrencies)[number]
  )
    ? storedDefaultCurrency
    : "ILS";

  const availableCurrencies = ["ILS", "USD", "EUR"];

  // State for success animation
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: undefined,
      currency: defaultCurrency,
      description: "",
      type: "income", // This will be the initial default for the form
      category: "",
      is_chomesh: false,
      recipient: "",
      isExempt: false,
      isRecognized: false,
      isFromPersonalFunds: false,
      is_recurring: false,
      frequency: "monthly", // Default to monthly
      recurring_day_of_month: undefined,
      recurringTotalCount: undefined,
    },
  });

  const selectedType = form.watch("type");
  const isExemptChecked = form.watch("isExempt");
  const isRecurringChecked = form.watch("is_recurring");
  const isFromPersonalFundsChecked = form.watch("isFromPersonalFunds");

  async function onSubmit(values: TransactionFormValues) {
    setIsSuccess(false);
    console.log("Form values submitted to onSubmit handler:", values);
    try {
      await handleTransactionSubmit(values);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        const currentType = form.getValues("type");
        form.reset({
          date: new Date().toISOString().split("T")[0],
          amount: undefined,
          currency: defaultCurrency, // Reset to a guaranteed valid currency
          description: "",
          type: currentType,
          category: "",
          is_chomesh: false,
          recipient: "",
          isExempt: false,
          isRecognized: false,
          isFromPersonalFunds: false,
          is_recurring: false,
          frequency: "monthly",
          recurring_day_of_month: undefined,
          recurringTotalCount: undefined,
        });
        if (onSubmitSuccess) onSubmitSuccess();
      }, 1500);
    } catch (error) {
      console.error("Error during form submission process:", error);
      // TODO: Add user-facing error message (e.g., using a toast library)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "space-y-6 p-4 rounded-xl transition-colors duration-200",
          backgroundStyles[selectedType]
        )}
      >
        {/* Type Selection using Tabs - Replaced with new component */}
        <TransactionTypeSelector form={form} selectedType={selectedType} />

        {/* סכום (כולל מטבע) ותאריך באותה שורה - Replaced with new component */}
        <AmountCurrencyDateFields
          form={form}
          availableCurrencies={availableCurrencies}
        />

        {/* תיאור וקטגוריה/מקבל תרומה באותה שורה - Replaced with new component */}
        <DescriptionCategoryFields form={form} selectedType={selectedType} />

        {/* כל הצ'קבוקסים בשורה אחת כריבועים - Replaced with new component */}
        <TransactionCheckboxes
          form={form}
          selectedType={selectedType}
          isExemptChecked={isExemptChecked}
          isFromPersonalFundsChecked={isFromPersonalFundsChecked}
        />

        {/* Recurring fields section - Replaced with new component where applicable */}
        {isRecurringChecked && <RecurringFields form={form} />}

        {/* Submit and Cancel Buttons - Replaced with new component */}
        <FormActionButtons
          isSubmitting={form.formState.isSubmitting}
          isSuccess={isSuccess}
          onCancel={onCancel}
        />
      </form>
    </Form>
  );
}
