import { z } from "zod";
import { transactionTypes, Currency } from "../types/transaction"; // Import Currency type as well

// Define currency values from the Currency type for Zod enum
const currencyEnumValues: [Currency, ...Currency[]] = ["ILS", "USD", "EUR"];

// Base schema for common transaction fields
export const transactionBaseSchema = z.object({
  id: z.string().uuid().optional(), // Optional for creation, present for updates
  user_id: z.string().uuid().nullable().optional(), // Now allows null, in addition to string UUID or undefined
  date: z.string().refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), {
    message: "תאריך חייב להיות בפורמט YYYY-MM-DD",
  }),
  amount: z.coerce
    .number({ invalid_type_error: "סכום חייב להיות מספר" })
    .min(0.01, "הסכום חייב להיות גדול מ-0"),
  currency: z.enum(currencyEnumValues, {
    errorMap: () => ({ message: "מטבע לא תקין" }),
  }),
  description: z.string().max(255).nullable().optional(),
  type: z.enum(transactionTypes, {
    errorMap: () => ({ message: "סוג תנועה לא תקין" }),
  }),
  category: z.string().max(100, "קטגוריה ארוכה מדי").optional().nullable(),
  is_chomesh: z.boolean().default(false).optional().nullable(),
  recipient: z.string().max(100, "נמען/משלם ארוך מדי").optional().nullable(),
  is_recurring: z.boolean().default(false).optional().nullable(),
  recurring_day_of_month: z.coerce // Use coerce
    .number({ invalid_type_error: "יום בחודש חייב להיות מספר" })
    .int({ message: "יום בחודש חייב להיות שלם" })
    .min(1, { message: "יום בחודש חייב להיות לפחות 1" })
    .max(31, { message: "יום בחודש חייב להיות לכל היותר 31" })
    .optional()
    .nullable(),
  recurring_total_count: z.coerce // Use coerce
    .number({ invalid_type_error: "מספר חזרות חייב להיות מספר" })
    .int({ message: "מספר חזרות חייב להיות שלם" })
    .min(1, { message: "מספר חזרות חייב להיות לפחות 1" })
    .optional()
    .nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  source_recurring_id: z.string().optional().nullable(),
  occurrence_number: z.number().optional().nullable(),
  recurring_info: z.any().optional(), // Allow any shape for now, can be refined later
});

// Specific schemas can extend or refine the base if needed
export const incomeSchema = transactionBaseSchema.extend({
  type: z.literal("income"),
});

export const donationSchema = transactionBaseSchema.extend({
  type: z.literal("donation"),
  recipient: z
    .string()
    .min(2, "שם המקבל חייב להכיל לפחות 2 תווים")
    .max(100)
    .optional() // Keeping it optional to align with base, can be made mandatory if needed
    .nullable(),
});

export const expenseSchema = transactionBaseSchema.extend({
  type: z.literal("expense"),
});

export const transactionFormSchema = transactionBaseSchema.extend({
  is_recurring_checkbox: z.boolean().optional(),
});
