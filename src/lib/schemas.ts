import { z } from "zod";

export const incomeSchema = z.object({
  description: z.string().min(2, "נדרש תיאור של לפחות 2 תווים"),
  amount: z.number().min(0.01, "הסכום חייב להיות גדול מ-0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "נדרש תאריך תקין"),
  currency: z.enum(["ILS", "USD", "EUR"]).default("ILS"),
  is_chomesh: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurringDay: z.number().min(1).max(31).optional(),
});

export const donationSchema = z.object({
  recipient: z.string().min(2, "נדרש שם מקבל של לפחות 2 תווים"),
  amount: z.number().min(0.01, "הסכום חייב להיות גדול מ-0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "נדרש תאריך תקין"),
  currency: z.enum(["ILS", "USD", "EUR"]).default("ILS"),
  isRecurring: z.boolean().default(false),
  recurringDay: z.number().min(1).max(31).optional(),
});
