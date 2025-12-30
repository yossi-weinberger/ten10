import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDonationStore } from "@/lib/store";
import {
  handleTransactionSubmit,
  determineFinalType,
  normalizeToBaseType,
} from "@/lib/data-layer/transactionForm.service";
import {
  TransactionFormValues,
  createTransactionFormSchema,
} from "@/lib/schemas";
import { TransactionType } from "@/types/transaction";
import { Form } from "@/components/ui/form";
// import { CheckCircle } from "lucide-react";
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
import { useTransactionFormInitialization } from "@/hooks/useTransactionFormInitialization";
import { logger } from "@/lib/logger";

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
  const { search, getInitialType } =
    useTransactionFormInitialization(isEditMode);

  // Labels are handled where rendered

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

  const transactionSchema = useMemo(() => createTransactionFormSchema(t), [t]);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    mode: "onChange",
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: undefined,
      currency: defaultCurrency,
      description: "",
      type: getInitialType(), // Use URL param if valid, else default to "income"
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

  // Update form when URL search params change
  useEffect(() => {
    if (
      !isEditMode && // Only run when creating a new transaction
      "type" in search &&
      search.type &&
      search.type !== form.getValues("type") &&
      [
        "income",
        "expense",
        "donation",
        "exempt-income",
        "recognized-expense",
        "non_tithe_donation",
      ].includes(search.type as TransactionType)
    ) {
      form.setValue("type", search.type as TransactionType);
    }
  }, [search, form, isEditMode]);

  // Use useEffect to reset the form when initialData changes (for editing)
  React.useEffect(() => {
    if (isEditMode && initialData) {
      // Normalize the type to base type for the form (TypeSelector only shows base types)
      const baseType = normalizeToBaseType(initialData.type);

      const defaultVals: Partial<TransactionFormValues> = {
        ...initialData,
        type: baseType, // Use normalized base type instead of derived type
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

  React.useEffect(() => {
    const errors = form.formState.errors;
    if (errors && Object.keys(errors).length > 0) {
      logger.log("Form errors:", errors);
    }
  }, [form.formState.errors]);

  const selectedType = form.watch("type");
  const isExemptChecked = form.watch("isExempt");
  const isRecurringChecked = form.watch("is_recurring");

  async function onSubmit(values: TransactionFormValues) {
    setIsSuccess(false);
    logger.log("Form values submitted:", values);

    if (isEditMode) {
      if (!initialData || !initialData.id) {
        logger.error("Cannot update: missing initial data or transaction ID.");
        return;
      }
      // Logic for updating an existing transaction
      const updatePayload: Partial<Transaction> = {};

      // Calculate the final type from form values (including checkboxes)
      const newFinalType = determineFinalType(values);
      const oldFinalType = initialData.type;

      // Check if the type changed (considering checkboxes)
      if (newFinalType !== oldFinalType) {
        updatePayload.type = newFinalType;
      }

      // Compare other fields that exist in Transaction
      // List of user-editable fields that can be updated.
      // Excluded fields:
      // - id, user_id, created_at, updated_at: System fields, not user-editable
      // - type: Handled separately above using determineFinalType (includes checkbox logic)
      // - source_recurring_id, execution_count, recurring_*: Recurring transaction metadata, not editable here
      const transactionFields: Array<keyof Transaction> = [
        "date",
        "amount",
        "currency",
        "description",
        "category",
        "is_chomesh",
        "recipient",
      ];

      // Helper function to safely assign values to updatePayload
      const assignToPayload = <K extends keyof Transaction>(
        key: K,
        value: Transaction[K]
      ): void => {
        updatePayload[key] = value;
      };

      transactionFields.forEach((key) => {
        const formKey = key as keyof TransactionFormValues;
        const formValue = values[formKey];
        const initialValue = initialData[key];

        // Special handling for date field (always string in form, string in DB)
        if (key === "date") {
          // Date is always a string in format "YYYY-MM-DD"
          const formDateStr = formValue as Transaction["date"];
          const initialDateStr = initialValue as Transaction["date"];
          if (formDateStr !== initialDateStr) {
            assignToPayload("date", formDateStr);
          }
          return;
        }

        // Normalize values for comparison (handle null, undefined, empty string)
        const normalizedFormValue =
          formValue === "" || formValue === undefined ? null : formValue;
        const normalizedInitialValue =
          initialValue === "" || initialValue === undefined
            ? null
            : initialValue;

        // Compare normalized values
        if (normalizedFormValue !== normalizedInitialValue) {
          // Convert empty string to null for database consistency
          // Type assertion is safe here because:
          // 1. We know the key exists in both TransactionFormValues and Transaction
          // 2. We're normalizing undefined/empty string to null to match Transaction's types
          // 3. The transactionFields array only contains valid Transaction keys
          const normalizedValue = (
            formValue === "" ? null : formValue
          ) as Transaction[typeof key];
          assignToPayload(key, normalizedValue);
        }
      });

      if (Object.keys(updatePayload).length > 0) {
        try {
          await updateTransaction(initialData.id, updatePayload, platform);
          setIsSuccess(true);
          setTimeout(() => {
            setIsSuccess(false);
            if (onSubmitSuccess) onSubmitSuccess();
          }, 1500);
        } catch (error) {
          logger.error("Error updating transaction:", error);
        }
      } else {
        logger.log("No changes detected, skipping update.");
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
        logger.error("Error creating transaction:", error);
      }
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        autoComplete="on"
        className={cn(
          "space-y-6 p-4 rounded-xl transition-colors duration-500 ease-in-out",
          backgroundStyles[selectedType]
        )}
      >
        {/* Type Selection using Tabs - Replaced with new component */}
        <TransactionTypeSelector form={form} selectedType={selectedType} />

        {/* Amount, currency and date fields - Replaced with new component */}
        <AmountCurrencyDateFields
          form={form}
          availableCurrencies={CURRENCIES}
        />

        {/* Description and category/recipient fields - Replaced with new component */}
        <DescriptionCategoryFields form={form} selectedType={selectedType} />

        {/* All checkboxes in one row as squares - Replaced with new component */}
        <TransactionCheckboxes
          form={form}
          selectedType={selectedType}
          isExemptChecked={isExemptChecked}
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
