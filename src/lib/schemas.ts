import { z } from "zod";
import { transactionTypes } from "../types/transaction";
import { TFunction } from "i18next";

// =======================================================================
// VALIDATION CONSTANTS
// =======================================================================
const MIN_SUBJECT_LENGTH = 5;
const MIN_BODY_LENGTH = 20;

// =======================================================================
// REUSABLE FIELD SCHEMAS
// =======================================================================

const amountSchema = z.coerce
  .number({ error: "הסכום חייב להיות מספר" })
  .positive({ error: "הסכום חייב להיות גדול מאפס" });

const currencySchema = z.enum(["ILS", "USD", "EUR"], {
  error: "יש לבחור מטבע",
});

const dayOfMonthSchema = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.coerce
    .number({ error: "יום בחודש חייב להיות מספר" })
    .int({ error: "יום בחודש חייב להיות מספר שלם" })
    .min(1, { error: "היום בחודש חייב להיות בין 1 ל-31" })
    .max(31, { error: "היום בחודש חייב להיות בין 1 ל-31" })
    .optional()
);

const totalOccurrencesSchema = z.preprocess(
  (val) => (val === "" || val === null ? undefined : val),
  z.coerce
    .number({ error: "מספר חזרות חייב להיות מספר" })
    .int({ error: "מספר חזרות חייב להיות שלם" })
    .positive({ error: "מספר חזרות חייב להיות חיובי" })
    .optional()
);

// =======================================================================
// FULL TRANSACTION FORM SCHEMA
// =======================================================================

export const transactionFormSchema = z
  .object({
    amount: amountSchema,
    currency: currencySchema,
    date: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "תאריך לא תקין",
    }),
    description: z
      .string()
      .max(100, { error: "התיאור יכול להכיל עד 100 תווים" })
      .optional()
      .nullable(),
    type: z.enum(transactionTypes, {
      error: "יש לבחור סוג טרנזקציה",
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
      .enum(["monthly", "weekly", "yearly", "daily"], {
        error: "יש לבחור תדירות",
      })
      .optional(),
    recurring_day_of_month: dayOfMonthSchema,
    recurringTotalCount: totalOccurrencesSchema,

    // Fields for editing recurring transactions
    status: z.enum(["active", "paused", "completed", "cancelled"]).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "income" && data.isExempt && data.is_chomesh) {
        return false;
      }
      return true;
    },
    {
      message: "לא ניתן לסמן חומש עבור הכנסה פטורה",
      path: ["is_chomesh"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "donation") {
        return true;
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

// =======================================================================
// RECURRING TRANSACTION EDIT FORM SCHEMA
// =======================================================================

export const recurringEditSchema = z.object({
  amount: amountSchema,
  currency: currencySchema,
  description: z.string().optional(),
  status: z.enum(["active", "paused", "completed", "cancelled"]),
  total_occurrences: totalOccurrencesSchema.nullable(),
  day_of_month: dayOfMonthSchema.nullable(),
});

export type RecurringEditFormValues = z.infer<typeof recurringEditSchema>;

// =======================================================================
// CONTACT FORM SCHEMAS
// =======================================================================

export type ContactRabbiFormValues = {
  subject: string;
  body: string;
  captchaToken: string;
};

export type ContactDevFormValues = ContactRabbiFormValues & {
  severity: "low" | "med" | "high";
};

export const createContactRabbiFormSchema = (t: TFunction) =>
  z.object({
    subject: z.string().min(MIN_SUBJECT_LENGTH, {
      message: t("contact:forms.subject.error"),
    }),
    body: z.string().min(MIN_BODY_LENGTH, {
      message: t("contact:forms.body.error"),
    }),
    captchaToken: z
      .string()
      .min(1, { message: t("contact:forms.captcha.error") }),
  });

export const createContactDevFormSchema = (t: TFunction) =>
  createContactRabbiFormSchema(t).extend({
    severity: z.enum(["low", "med", "high"], {
      required_error: t("contact:forms.severity.error"),
    }),
  });
