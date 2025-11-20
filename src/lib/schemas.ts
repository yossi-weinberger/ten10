import { z } from "zod";
import { transactionTypes } from "../types/transaction";
import type { TFunction } from "i18next";

// =======================================================================
// VALIDATION CONSTANTS
// =======================================================================
const MIN_SUBJECT_LENGTH = 5;
const MIN_BODY_LENGTH = 20;

// =======================================================================
// REUSABLE FIELD SCHEMAS
// =======================================================================

const createAmountSchema = (t: TFunction) =>
  z.coerce
    .number({
      message: t("transactions:transactionForm.validation.amount.number"),
    })
    .positive({
      message: t("transactions:transactionForm.validation.amount.positive"),
    });

const createCurrencySchema = (t: TFunction) =>
  z.enum(["ILS", "USD", "EUR"], {
    message: t("transactions:transactionForm.validation.currency.required"),
  });

const createDayOfMonthSchema = (t: TFunction) =>
  z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce
      .number({
        message: t(
          "transactions:transactionForm.validation.recurring.dayOfMonth.number"
        ),
      })
      .int({
        message: t(
          "transactions:transactionForm.validation.recurring.dayOfMonth.integer"
        ),
      })
      .min(1, {
        message: t(
          "transactions:transactionForm.validation.recurring.dayOfMonth.range"
        ),
      })
      .max(31, {
        message: t(
          "transactions:transactionForm.validation.recurring.dayOfMonth.range"
        ),
      })
      .optional()
  );

const createTotalOccurrencesSchema = (t: TFunction) =>
  z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce
      .number({
        message: t(
          "transactions:transactionForm.validation.recurring.totalOccurrences.number"
        ),
      })
      .int({
        message: t(
          "transactions:transactionForm.validation.recurring.totalOccurrences.integer"
        ),
      })
      .positive({
        message: t(
          "transactions:transactionForm.validation.recurring.totalOccurrences.positive"
        ),
      })
      .optional()
  );

// =======================================================================
// FULL TRANSACTION FORM SCHEMA
// =======================================================================

export const createTransactionFormSchema = (t: TFunction) =>
  z
    .object({
      amount: createAmountSchema(t),
      currency: createCurrencySchema(t),
      date: z.string().refine((date) => !isNaN(Date.parse(date)), {
        message: t("transactions:transactionForm.validation.date.invalid"),
      }),
      description: z
        .string()
        .max(100, {
          message: t(
            "transactions:transactionForm.validation.description.maxLength"
          ),
        })
        .optional()
        .nullable(),
      type: z.enum(transactionTypes, {
        message: t("transactions:transactionForm.validation.type.required"),
      }),
      category: z
        .string()
        .optional()
        .nullable()
        .refine((val) => !val || val.length <= 50, {
          message: t(
            "transactions:transactionForm.validation.category.maxLength"
          ),
        }),
      is_chomesh: z.boolean().default(false).optional().nullable(),
      recipient: z
        .string()
        .optional()
        .nullable()
        .refine((val) => !val || val.length <= 50, {
          message: t(
            "transactions:transactionForm.validation.recipient.maxLength"
          ),
        }),
      isExempt: z.boolean().default(false),
      isRecognized: z.boolean().default(false),
      isFromPersonalFunds: z.boolean().default(false),

      // Recurring fields
      is_recurring: z.boolean().optional(),
      frequency: z
        .enum(["monthly", "weekly", "yearly", "daily"], {
          message: t(
            "transactions:transactionForm.validation.recurring.frequencyRequired"
          ),
        })
        .optional(),
      recurring_day_of_month: createDayOfMonthSchema(t),
      recurringTotalCount: createTotalOccurrencesSchema(t),

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
        message: t(
          "transactions:transactionForm.validation.chomesh.notForExempt"
        ),
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
        message: t(
          "transactions:transactionForm.validation.recipient.requiredForDonation"
        ),
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
        message: t(
          "transactions:transactionForm.validation.chomesh.onlyForIncome"
        ),
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
        message: t(
          "transactions:transactionForm.validation.recurring.dayOfMonth.requiredForMonthly"
        ),
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
        message: t(
          "transactions:transactionForm.validation.recurring.dayOfMonth.onlyForRecurring"
        ),
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
        message: t(
          "transactions:transactionForm.validation.recurring.frequency.required"
        ),
        path: ["frequency"],
      }
    );

export type TransactionFormValues = z.infer<
  ReturnType<typeof createTransactionFormSchema>
>;

// =======================================================================
// RECURRING TRANSACTION EDIT FORM SCHEMA
// =======================================================================

export const createRecurringEditSchema = (t: TFunction) =>
  z.object({
    amount: createAmountSchema(t),
    currency: createCurrencySchema(t),
    description: z.string().optional(),
    status: z.enum(["active", "paused", "completed", "cancelled"]),
    total_occurrences: createTotalOccurrencesSchema(t).nullable(),
    day_of_month: createDayOfMonthSchema(t).nullable(),
  });

export type RecurringEditFormValues = z.infer<
  ReturnType<typeof createRecurringEditSchema>
>;

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
      message: t("contact:forms.severity.error"),
    }),
  });
