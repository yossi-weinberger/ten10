import { z } from "zod";
import { transactionTypes } from "./transaction";

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
    amount: z.coerce
      .number({
        required_error: "יש להזין סכום",
        invalid_type_error: "הסכום חייב להיות מספר",
      })
      .positive({ message: "הסכום חייב להיות גדול מאפס" }),
    currency: z.enum(["ILS", "USD", "EUR"], {
      required_error: "יש לבחור מטבע",
    }),
    date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "תאריך לא תקין",
    }),
    description: z
      .string()
      .max(100, { message: "התיאור יכול להכיל עד 100 תווים" })
      .optional()
      .nullable(),
    type: z.enum(transactionTypes, {
      required_error: "יש לבחור סוג טרנזקציה",
    }),
    category: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || val.length <= 50, {
        message: "הקטגוריה יכולה להכיל עד 50 תווים",
      }),
    is_chomesh: z.boolean().default(false).optional().nullable(),
    recipient: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || val.length <= 50, {
        message: "שם המקבל יכול להכיל עד 50 תווים",
      }),
    isExempt: z.boolean().default(false),
    isRecognized: z.boolean().default(false),
    isFromPersonalFunds: z.boolean().default(false),

    // Recurring fields
    is_recurring: z.boolean().optional(),
    frequency: z
      .enum(["monthly", "weekly", "yearly"], {
        required_error: "יש לבחור תדירות",
      })
      .optional(),
    recurring_day_of_month: z.preprocess(
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce
        .number({ invalid_type_error: "חייב להיות מספר" })
        .int({ message: "חייב להיות מספר שלם" })
        .min(1, { message: "היום חייב להיות בין 1 ל-31" })
        .max(31, { message: "היום חייב להיות בין 1 ל-31" })
        .optional()
    ),
    recurringTotalCount: z.preprocess(
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
      if (data.type === "donation") {
        return !!data.recipient;
      }
      return true;
    },
    {
      message: "שם המקבל הוא שדה חובה עבור תרומות",
      path: ["recipient"],
    }
  )
  .refine(
    (data) => {
      if (data.type !== "income" && data.is_chomesh) {
        return false;
      }
      return true;
    },
    {
      message: "חומש רלוונטי רק להכנסות",
      path: ["is_chomesh"],
    }
  )
  .refine(
    (data) => {
      if (data.is_recurring && data.frequency === "monthly") {
        return (
          data.recurring_day_of_month !== undefined &&
          data.recurring_day_of_month !== null
        );
      }
      return true;
    },
    {
      message: "יש לציין יום בחודש עבור הוראת קבע חודשית",
      path: ["recurring_day_of_month"],
    }
  )
  .refine(
    (data) => {
      if (
        !data.is_recurring &&
        data.recurring_day_of_month !== undefined &&
        data.recurring_day_of_month !== null
      ) {
        return false;
      }
      return true;
    },
    {
      message: "לא ניתן לקבוע יום בחודש עבור תנועה שאינה הוראת קבע",
      path: ["recurring_day_of_month"],
    }
  )
  .refine(
    (data) => {
      if (data.is_recurring && !data.frequency) {
        return false;
      }
      return true;
    },
    {
      message: "יש לבחור תדירות עבור הוראת קבע",
      path: ["frequency"],
    }
  );

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;
