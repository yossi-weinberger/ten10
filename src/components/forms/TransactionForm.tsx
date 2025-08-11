import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDonationStore } from "@/lib/store";
import { handleTransactionSubmit } from "@/lib/data-layer/transactionForm.service";
import { TransactionFormValues, transactionFormSchema } from "@/lib/schemas";
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
import { CURRENCIES } from "@/lib/currencies";
import { Transaction } from "@/types/transaction";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import { usePlatform } from "@/contexts/PlatformContext";

// Zod schema is now imported from "@/types/forms"

// TODO: Use discriminatedUnion or refine schema for conditional requirements:
// - is_chomesh: required if type is 'income'
// - recipient: required if type is 'donation'
// - category: perhaps more relevant for 'expense'/'recognized-expense'

interface TransactionFormProps {
  initialData?: Transaction | null; // For editing
  isEditMode?: boolean;
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
  initialData,
  isEditMode = false,
  onSubmitSuccess,
  onCancel,
}: TransactionFormProps) {
  const { t } = useTranslation("transactions");
  const { platform } = usePlatform();

  // Transaction type labels with i18n
  const transactionTypeLabels: Record<TransactionType, string> = {
    income: t("transactionForm.transactionType.income"),
    donation: t("transactionForm.transactionType.donation"),
    expense: t("transactionForm.transactionType.expense"),
    "exempt-income": "הכנסה פטורה", // For future use
    "recognized-expense": "הוצאה מוכרת", // For future use
    non_tithe_donation: "תרומה שאינה ממעשר", // Renamed label
  };

  const updateTransaction = useTableTransactionsStore(
    (state) => state.updateTransaction
  );
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

  // State for success animation
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    mode: "onChange",
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: undefined,
      currency: defaultCurrency,
      description: "",
      type: "income",
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
    },
  });

  // Use useEffect to reset the form when initialData changes (for editing)
  React.useEffect(() => {
    if (isEditMode && initialData) {
      const defaultVals: Partial<TransactionFormValues> = {
        ...initialData,
        date: initialData.date
          ? new Date(initialData.date).toISOString().split("T")[0]
          : "",
        // Map backend fields to form fields if necessary
        isExempt: initialData.type === "exempt-income",
        isRecognized: initialData.type === "recognized-expense",
        isFromPersonalFunds: initialData.type === "non_tithe_donation",
        is_recurring: !!initialData.source_recurring_id, // Example logic
      };
      form.reset(defaultVals);
    }
  }, [initialData, isEditMode, form]);

  console.log("Form errors:", form.formState.errors);

  const selectedType = form.watch("type");
  const isExemptChecked = form.watch("isExempt");
  const isRecurringChecked = form.watch("is_recurring");
  const isFromPersonalFundsChecked = form.watch("isFromPersonalFunds");

  async function onSubmit(values: TransactionFormValues) {
    setIsSuccess(false);
    console.log("Form values submitted:", values);

    if (isEditMode) {
      if (!initialData || !initialData.id) {
        console.error("Cannot update: missing initial data or transaction ID.");
        return;
      }
      // Logic for updating an existing transaction
      const updatePayload: Partial<Transaction> = {};
      (Object.keys(values) as Array<keyof TransactionFormValues>).forEach(
        (key) => {
          if (values[key] !== initialData[key as keyof Transaction]) {
            const value = values[key];
            updatePayload[key as keyof Transaction] =
              value === "" ? null : (value as any);
          }
        }
      );
      if (Object.keys(updatePayload).length > 0) {
        try {
          await updateTransaction(initialData.id, updatePayload, platform);
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            if (onSubmitSuccess) onSubmitSuccess();
          }, 1500);
        } catch (error) {
          console.error("Error updating transaction:", error);
        }
      } else {
        console.log("No changes detected, skipping update.");
        if (onSubmitSuccess) onSubmitSuccess();
      }
    } else {
      // Logic for creating a new transaction
      try {
        await handleTransactionSubmit(values);
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          form.reset({
            date: new Date().toISOString().split("T")[0],
            amount: undefined,
            currency: defaultCurrency,
            description: "",
            type: form.getValues("type"), // Use the current form value, not the submitted one
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
        console.error("Error creating transaction:", error);
      }
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
          availableCurrencies={CURRENCIES}
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
          isEditMode={isEditMode}
        />
      </form>
    </Form>
  );
}
