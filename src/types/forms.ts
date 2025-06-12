import { z } from "zod";

// Define the possible transaction types for the form select
export const allTransactionTypes = [
  "income",
  "donation",
  "expense",
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
] as const; // Use 'as const' for Zod enum

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

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
