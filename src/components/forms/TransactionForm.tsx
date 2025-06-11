import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { nanoid } from "nanoid";
import { useDonationStore } from "@/lib/store";
import { addTransaction } from "@/lib/dataService";
import { createRecurringTransaction } from "@/lib/recurringTransactionsService";
import {
  Transaction,
  TransactionType,
  RecurringTransaction,
} from "@/types/transaction";
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
  "non_tithe_donation",
] as const; // Use 'as const' for Zod enum

// Hebrew labels for transaction types
const transactionTypeLabels: Record<TransactionType, string> = {
  income: "הכנסה",
  donation: "תרומה",
  expense: "הוצאה",
  "exempt-income": "הכנסה פטורה", // For future use
  "recognized-expense": "הוצאה מוכרת", // For future use
  non_tithe_donation: "תרומה שאינה ממעשר", // Renamed label
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
    is_chomesh: z.boolean().optional(),
    recipient: z.string().optional(),
    // New boolean fields for UI control
    isExempt: z.boolean().optional(),
    isRecognized: z.boolean().optional(),
    isFromPersonalFunds: z.boolean().optional(),

    // Recurring fields
    is_recurring: z.boolean().optional(),
    frequency: z
      .enum(["monthly", "weekly", "yearly"], {
        required_error: "יש לבחור תדירות",
      })
      .optional(),
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
      // is_chomesh cannot be true if isExempt is true
      if (data.type === "income" && data.isExempt && data.is_chomesh) {
        return false;
      }
      return true;
    },
    {
      message: "לא ניתן לסמן חומש עבור הכנסה פטורה",
      path: ["is_chomesh"], // Changed from ["isChomesh "]
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
  )
  .refine(
    (data) => {
      // If it's recurring, frequency must be provided
      if (data.is_recurring && !data.frequency) {
        return false;
      }
      return true;
    },
    {
      message: "יש לבחור תדירות",
      path: ["frequency"],
    }
  );
// TODO: Use discriminatedUnion or refine schema for conditional requirements:
// - is_chomesh: required if type is 'income'
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
  non_tithe_donation: "bg-yellow-50 dark:bg-yellow-950", // Renamed, kept style same as donation
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
    console.log("Form values submitted:", values);

    // If it's a recurring transaction, use the new service
    if (values.is_recurring) {
      try {
        // We need to map the form values to the NewRecurringTransaction type
        // This requires adding start_date, frequency etc. to the form first
        // For now, let's assume they exist and are named correctly
        const recurringDefinition = {
          start_date: values.date, // Use the transaction date as the start date for now
          next_due_date: values.date, // The first one is due on the start date
          frequency: values.frequency || "monthly", // Use form value or default
          day_of_month: values.recurring_day_of_month,
          total_occurrences: values.recurringTotalCount,
          amount: values.amount,
          currency: values.currency,
          description: values.description,
          type: values.type, // The base type (e.g., 'income', 'donation')
          category: values.category,
          is_chomesh: values.is_chomesh,
          recipient: values.recipient,
        };

        // @ts-ignore - a lot of fields are missing, this is just a placeholder
        await createRecurringTransaction(recurringDefinition as any);

        console.log("Recurring transaction definition created successfully.");
        // Handle success (show animation, reset form, etc.)
        setIsSuccess(true);
        setTimeout(() => {
          form.reset();
          if (onSubmitSuccess) onSubmitSuccess();
          setIsSuccess(false);
        }, 1500);
      } catch (error) {
        console.error("Failed to create recurring transaction:", error);
        // TODO: Show an error message to the user
      }
      return; // Stop execution here for recurring transactions
    }

    // --- Existing logic for single transactions ---
    // Determine the actual transaction type based on the form's 'type' and checkboxes
    let finalType: TransactionType = values.type;
    if (values.type === "expense" && values.isRecognized) {
      finalType = "recognized-expense";
    } else if (values.type === "income" && values.isExempt) {
      finalType = "exempt-income";
    } else if (values.type === "donation" && values.isFromPersonalFunds) {
      finalType = "non_tithe_donation"; // Renamed
    }

    // Prepare the transaction object for saving
    // Ensure all fields match the 'Transaction' type (especially snake_case)
    const transactionData: Omit<
      Transaction,
      "isExempt" | "isRecognized" | "isFromPersonalFunds" // Exclude UI-only fields
    > = {
      id: nanoid(),
      user_id: "", // Will be set by Supabase/backend logic in addTransaction
      date: values.date,
      amount: values.amount,
      currency: values.currency as Transaction["currency"], // Cast to ensure type compatibility
      description: values.description || null,
      type: finalType,
      category: values.category || null,

      is_chomesh:
        finalType === "income" ? values.is_chomesh || false : undefined,
      recipient: finalType === "donation" ? values.recipient || null : null,

      is_recurring:
        typeof values.is_recurring === "boolean"
          ? values.is_recurring
          : undefined,
      recurring_day_of_month: values.is_recurring
        ? values.recurring_day_of_month || null
        : null,
      recurring_total_count: values.is_recurring
        ? values.recurringTotalCount || null
        : null,

      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Transaction object to save:", transactionData);

    try {
      await addTransaction(transactionData as Transaction); // Cast as Transaction after omitting helper fields

      // Update Zustand store (assuming addTransaction doesn't do it)
      // useDonationStore.getState().addTransaction(transactionData as Transaction);

      console.log("Transaction added successfully!");
      setIsSuccess(true); // Trigger success animation/feedback

      // Reset form to default values after a short delay to show success
      setTimeout(() => {
        form.reset({
          date: new Date().toISOString().split("T")[0],
          amount: undefined,
          currency: defaultCurrency,
          description: "",
          type: values.type, // Changed from "income" to preserve the last selected type
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
        });
        setIsSuccess(false); // Reset success state after form reset
        if (onSubmitSuccess) onSubmitSuccess();
      }, 1500); // 1.5 seconds delay
    } catch (error) {
      console.error("Error adding transaction:", error);
      // TODO: Show user-friendly error message in the UI
      // Example: form.setError("root.serverError", { type: "manual", message: "Failed to save transaction." });
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
