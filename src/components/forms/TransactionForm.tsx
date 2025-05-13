import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { nanoid } from "nanoid";
import { useDonationStore } from "@/lib/store";
import { addTransaction } from "@/lib/dataService";
import { Transaction, TransactionType } from "@/types/transaction";
import { Form } from "@/components/ui/form";
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionTypeSelector } from "./transaction-form-parts/TransactionTypeSelector";
import { AmountCurrencyDateFields } from "./transaction-form-parts/AmountCurrencyDateFields";
import { DescriptionCategoryFields } from "./transaction-form-parts/DescriptionCategoryFields";
import { TransactionCheckboxes } from "./transaction-form-parts/TransactionCheckboxes";
import { RecurringFields } from "./transaction-form-parts/RecurringFields";
import { FormActionButtons } from "./transaction-form-parts/FormActionButtons";

// Define the possible transaction types for the form select
const allTransactionTypes = [
  "income",
  "donation",
  "expense",
  "exempt-income",
  "recognized-expense",
] as const; // Use 'as const' for Zod enum

// Hebrew labels for transaction types
const transactionTypeLabels: Record<TransactionType, string> = {
  income: "הכנסה",
  donation: "תרומה",
  expense: "הוצאה",
  "exempt-income": "הכנסה פטורה", // For future use
  "recognized-expense": "הוצאה מוכרת", // For future use
};

// Base Zod schema - use allTransactionTypes for validation
export const transactionFormSchema = z
  .object({
    // We'll get ID, userId, createdAt, updatedAt programmatically
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"), // Placeholder - replace with date picker validation later
    amount: z.preprocess(
      (val) => (val === "" ? undefined : val), // Convert empty string to undefined first
      z.coerce // Then coerce
        .number({
          invalid_type_error: "הסכום חייב להיות מספר",
        })
        .positive({ message: "הסכום חייב להיות חיובי" })
    ),
    currency: z.string().min(1, "Currency is required"), // Later refine with Currency type from store
    description: z.string().optional(),
    type: z.enum(allTransactionTypes, {
      // Validate against all possible types
      required_error: "יש לבחור סוג טרנזקציה", // Translate error message
    }),
    category: z.string().optional(),
    // Conditional fields
    isChomesh: z.boolean().optional(),
    recipient: z.string().optional(),
    // New boolean fields for UI control
    isExempt: z.boolean().optional(),
    isRecognized: z.boolean().optional(),

    // Recurring fields
    is_recurring: z.boolean().optional(),
    recurring_day_of_month: z.preprocess(
      // Allow empty string or null to become undefined for optional validation
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce
        .number({ invalid_type_error: "חייב להיות מספר" })
        .int({ message: "חייב להיות מספר שלם" })
        .min(1, { message: "היום חייב להיות בין 1 ל-31" })
        .max(31, { message: "היום חייב להיות בין 1 ל-31" })
        .optional() // Make it optional initially
    ),
    recurringTotalCount: z.preprocess(
      // Allow empty string or null to become undefined for optional validation
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce
        .number({ invalid_type_error: "חייב להיות מספר" })
        .int({ message: "חייב להיות מספר שלם" })
        .positive({ message: "מספר החזרות חייב להיות חיובי" })
        .optional()
    ),
  })
  .refine(
    (data) => {
      // isChomesh cannot be true if isExempt is true
      if (data.type === "income" && data.isExempt && data.isChomesh) {
        return false;
      }
      return true;
    },
    {
      message: "לא ניתן לסמן חומש עבור הכנסה פטורה",
      path: ["isChomesh"], // Attach error to isChomesh field
    }
  )
  // Refine for recurring fields
  .refine(
    (data) => {
      // If it's recurring, day must be provided
      if (
        data.is_recurring &&
        (data.recurring_day_of_month === undefined ||
          data.recurring_day_of_month === null)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "יש לבחור יום בחודש עבור הוראת קבע",
      path: ["recurring_day_of_month"], // Attach error to the day field
    }
  )
  .refine(
    (data) => {
      // If it's recurring and recurringTotalCount is provided, it must be a positive number
      if (
        data.is_recurring &&
        data.recurringTotalCount !== undefined &&
        data.recurringTotalCount !== null &&
        data.recurringTotalCount <= 0
      ) {
        return false;
      }
      return true;
    },
    {
      message: "מספר החזרות חייב להיות גדול מאפס",
      path: ["recurringTotalCount"],
    }
  )
  .refine(
    (data) => {
      // If it's NOT recurring, day must be null/undefined
      if (
        !data.is_recurring &&
        data.recurring_day_of_month !== undefined &&
        data.recurring_day_of_month !== null
      ) {
        // This case shouldn't happen if UI is correct, but good for robustness
        // We'll handle setting it to null in onSubmit, so just return true here
        // Alternatively, you could clear it here using a transform, but refine is simpler
        return true;
      }
      return true;
    },
    {
      // No message needed as we handle this in onSubmit
      path: ["recurring_day_of_month"],
    }
  );
// TODO: Use discriminatedUnion or refine schema for conditional requirements:
// - isChomesh: required if type is 'income'
// - recipient: required if type is 'donation'
// - category: perhaps more relevant for 'expense'/'recognized-expense'

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

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
};

export function TransactionForm({
  onSubmitSuccess,
  onCancel,
}: TransactionFormProps) {
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );
  // TODO: Fetch available currencies if needed, or use the type from store
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
      isChomesh: false,
      recipient: "",
      isExempt: false,
      isRecognized: false,
      is_recurring: false,
      recurring_day_of_month: undefined,
      recurringTotalCount: undefined,
    },
  });

  const selectedType = form.watch("type");
  const isExemptChecked = form.watch("isExempt");
  const isRecurringChecked = form.watch("is_recurring");

  async function onSubmit(values: TransactionFormValues) {
    // Determine the final transaction type based on initial type and checkboxes
    let finalType: TransactionType;
    if (values.type === "income") {
      finalType = values.isExempt ? "exempt-income" : "income";
    } else if (values.type === "expense") {
      finalType = values.isRecognized ? "recognized-expense" : "expense";
    } else {
      finalType = values.type as TransactionType; // Should be 'donation' here
    }

    const newTransaction: Omit<
      Transaction,
      "isExempt" | "isRecognized" // Exclude helper fields
    > = {
      id: nanoid(),
      user_id: null,
      date: values.date,
      amount: values.amount,
      currency: values.currency as any,
      description: values.description || null,
      type: finalType, // Use the determined final type
      category: values.category || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Conditionally add isChomesh only if the final type is 'income'
      ...(finalType === "income" && { isChomesh: values.isChomesh || false }),
      // Conditionally add recipient only if the final type is 'donation' (redundant check, but safe)
      ...(finalType === "donation" && {
        recipient: values.recipient || null,
      }),
      // Add recurring fields
      is_recurring: values.is_recurring || false,
      recurring_day_of_month: values.is_recurring
        ? values.recurring_day_of_month
        : null,
      recurringTotalCount:
        values.is_recurring && values.recurringTotalCount
          ? values.recurringTotalCount
          : null,
    };

    // DEBUG: Log the object being sent to the backend
    console.log("Submitting transaction object:", newTransaction);

    console.log("Submitting final transaction object:", newTransaction);
    try {
      await addTransaction(newTransaction as Transaction);
      console.log("Transaction added successfully!");

      // Get the current type before resetting
      const currentType = form.getValues("type");

      // Reset the form, preserving the selected type and default currency
      console.log(
        "Attempting to reset form. Current amount before reset:",
        form.getValues("amount")
      ); // DEBUG
      form.reset({
        date: new Date().toISOString().split("T")[0],
        amount: undefined, // Reset amount back to undefined to satisfy TypeScript
        currency: defaultCurrency,
        description: "",
        type: currentType, // Preserve the current type
        category: "",
        isChomesh: false,
        recipient: "",
        isExempt: false,
        isRecognized: false,
        is_recurring: false, // Reset recurring flag
        recurring_day_of_month: undefined, // Reset recurring day
        recurringTotalCount: undefined,
      });

      // Trigger success animation
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
      }, 2000); // Hide after 2 seconds

      onSubmitSuccess?.();
    } catch (error) {
      console.error("Failed to add transaction:", error);
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
