import { z } from "zod";

/** One closed object. Unused fields are null. The model does not calculate. */

const CURRENCIES = ["ILS", "USD", "EUR"] as const;
const TYPES = [
  "income",
  "expense",
  "donation",
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
] as const;
const SPECIAL_TYPES = ["exempt-income", "recognized-expense", "non_tithe_donation"] as const;
const PAYMENTS = ["credit_card", "cash", "bank_transfer", "bit_paybox", "check"] as const;
const DATE_KINDS = ["days_ago", "last_weekday", "day_of_month", "exact"] as const;

const dateStruct = z.object({
  kind: z.enum(DATE_KINDS),
  n: z.number().int().nullable(),
  weekday: z.number().int().nullable(),
  day: z.number().int().nullable(),
  month: z.number().int().nullable(),
  year: z.number().int().nullable(),
});

const recurrenceStruct = z.object({
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  calendar: z.enum(["gregorian", "hebrew"]),
  day_of_month: z.number().int().nullable(),
  weekday: z.number().int().nullable(),
  start_kind: z.enum(["this_month", "next_month", "date"]).nullable(),
  start: dateStruct.nullable(),
  end_kind: z.enum(["count", "end_of_year", "date"]).nullable(),
  end_count: z.number().int().nullable(),
  end: dateStruct.nullable(),
  already_charged: z.boolean(),
});

const periodStruct = z.object({
  kind: z.enum(["year", "month", "last_n_months", "range", "all"]),
  year: z.number().int().nullable(),
  month: z.number().int().nullable(),
  n: z.number().int().nullable(),
  from: dateStruct.nullable(),
  to: dateStruct.nullable(),
  calendar: z.enum(["gregorian", "hebrew"]),
});

export const splitItemSchema = z.object({
  amount: z.number().nullable(),
  amount_text: z.string().nullable(),
  currency: z.enum(CURRENCIES).nullable(),
  requested_rate: z.number().nullable(),
  date: dateStruct.nullable(),
  date_text: z.string().nullable(),
  type: z.enum(TYPES).nullable(),
  type_question: z.enum(SPECIAL_TYPES).nullable(),
  recurrence: recurrenceStruct.nullable(),
  description: z.string(),
  payment_method: z.enum(PAYMENTS).nullable(),
  category: z.string().nullable(),
  rule_id: z.string().nullable(),
});

export const splitRuleSchema = z.object({
  match: z.string(),
  action: z.enum(SPECIAL_TYPES).nullable(),
});

export const splitQuestionSchema = z.object({
  measure: z.enum(["sum", "count", "average", "max"]),
  family: z.enum(["donation", "income", "expense"]).nullable(),
  recipient: z.string().nullable(),
  category: z.string().nullable(),
  payment_method: z.enum(PAYMENTS).nullable(),
  period: periodStruct,
});

export const splitPayloadSchema = z.object({
  items: z.array(splitItemSchema),
  more_than_five: z.boolean().nullish().transform((value) => value === true),
  rule: splitRuleSchema.nullish().transform((value) => value ?? null),
  question: splitQuestionSchema.nullish().transform((value) => value ?? null),
});

export type SplitItemInput = z.infer<typeof splitItemSchema>;
export type SplitRuleInput = z.infer<typeof splitRuleSchema>;
export type SplitQuestionInput = z.infer<typeof splitQuestionSchema>;
export type SplitPayload = z.infer<typeof splitPayloadSchema>;

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: "null" }] });

const dateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "n", "weekday", "day", "month", "year"],
  properties: {
    kind: { type: "string", enum: [...DATE_KINDS] },
    n: nullable({ type: "integer" }),
    weekday: nullable({ type: "integer" }),
    day: nullable({ type: "integer" }),
    month: nullable({ type: "integer" }),
    year: nullable({ type: "integer" }),
  },
};

const itemSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "amount",
    "amount_text",
    "currency",
    "requested_rate",
    "date",
    "date_text",
    "type",
    "type_question",
    "recurrence",
    "description",
    "payment_method",
    "category",
    "rule_id",
  ],
  properties: {
    amount: nullable({ type: "number" }),
    amount_text: nullable({ type: "string" }),
    currency: nullable({ type: "string", enum: [...CURRENCIES] }),
    requested_rate: nullable({ type: "number" }),
    date: nullable(dateSchema),
    date_text: nullable({ type: "string" }),
    type: nullable({ type: "string", enum: [...TYPES] }),
    type_question: nullable({ type: "string", enum: [...SPECIAL_TYPES] }),
    recurrence: nullable({
      type: "object",
      additionalProperties: false,
      required: [
        "frequency",
        "calendar",
        "day_of_month",
        "weekday",
        "start_kind",
        "start",
        "end_kind",
        "end_count",
        "end",
        "already_charged",
      ],
      properties: {
        frequency: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"] },
        calendar: { type: "string", enum: ["gregorian", "hebrew"] },
        day_of_month: nullable({ type: "integer" }),
        weekday: nullable({ type: "integer" }),
        start_kind: nullable({ type: "string", enum: ["this_month", "next_month", "date"] }),
        start: nullable(dateSchema),
        end_kind: nullable({ type: "string", enum: ["count", "end_of_year", "date"] }),
        end_count: nullable({ type: "integer" }),
        end: nullable(dateSchema),
        already_charged: { type: "boolean" },
      },
    }),
    description: { type: "string" },
    payment_method: nullable({ type: "string", enum: [...PAYMENTS] }),
    category: nullable({ type: "string" }),
    rule_id: nullable({ type: "string" }),
  },
};

const enforcedDate = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "n", "weekday", "day", "month", "year"],
  properties: {
    kind: { type: "string", enum: [...DATE_KINDS] },
    n: { type: "integer" },
    weekday: { type: "integer" },
    day: { type: "integer" },
    month: { type: "integer" },
    year: { type: "integer" },
  },
};

const enforcedItem = {
  type: "object",
  additionalProperties: false,
  required: [
    "amount",
    "amount_text",
    "currency",
    "requested_rate",
    "date",
    "date_text",
    "type",
    "type_question",
    "recurrence",
    "description",
    "payment_method",
    "category",
    "rule_id",
  ],
  properties: {
    amount: nullable({ type: "number" }),
    amount_text: nullable({ type: "string" }),
    currency: nullable({ type: "string", enum: [...CURRENCIES] }),
    requested_rate: { type: "number" },
    date: nullable(enforcedDate),
    date_text: nullable({ type: "string" }),
    type: nullable({ type: "string", enum: [...TYPES] }),
    type_question: nullable({ type: "string", enum: [...SPECIAL_TYPES] }),
    recurrence: nullable({
      type: "object",
      additionalProperties: false,
      required: ["frequency", "calendar", "day_of_month", "weekday", "start_kind", "start", "end_kind", "end_count", "end", "already_charged"],
      properties: {
        frequency: { type: "string", enum: ["daily", "weekly", "monthly", "yearly"] },
        calendar: { type: "string", enum: ["gregorian", "hebrew"] },
        day_of_month: { type: "integer" },
        weekday: { type: "integer" },
        start_kind: { type: "string" },
        start: enforcedDate,
        end_kind: { type: "string" },
        end_count: { type: "integer" },
        end: enforcedDate,
        already_charged: { type: "boolean" },
      },
    }),
    description: { type: "string" },
    payment_method: nullable({ type: "string", enum: [...PAYMENTS] }),
    category: { type: "string" },
    rule_id: { type: "string" },
  },
};

/**
 * Sent to Anthropic. At most 16 nullable unions.
 * Zero and an empty string stand in for null on the fields that are not unions.
 */
const textOrEmpty = { type: "string" };
const whole = { type: "integer" };

export const SPLIT_ENFORCED_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "more_than_five", "rule_match", "rule_action"],
  properties: {
    more_than_five: { type: "boolean" },
    rule_match: textOrEmpty,
    rule_action: textOrEmpty,
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "amount",
          "amount_text",
          "currency",
          "description",
          "type",
          "type_question",
          "payment_method",
          "date_text",
          "date_kind",
          "date_day",
          "date_month",
          "date_year",
          "recurrence_frequency",
        ],
        properties: {
          amount: nullable({ type: "number" }),
          amount_text: textOrEmpty,
          currency: { type: "string", enum: ["", ...CURRENCIES] },
          description: textOrEmpty,
          type: { type: "string", enum: ["", ...TYPES] },
          type_question: { type: "string", enum: ["", ...SPECIAL_TYPES] },
          payment_method: { type: "string", enum: ["", ...PAYMENTS] },
          date_text: textOrEmpty,
          date_kind: { type: "string", enum: ["", ...DATE_KINDS] },
          date_day: whole,
          date_month: whole,
          date_year: whole,
          recurrence_frequency: { type: "string", enum: ["", "daily", "weekly", "monthly", "yearly"] },
        },
      },
    },
  },
} as const;

/** Responses API `text.format`. Strict: the model may not add fields. */
export const SPLIT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["items", "more_than_five", "rule", "question"],
  properties: {
    items: { type: "array", items: itemSchema },
    more_than_five: { type: "boolean" },
    rule: nullable({
      type: "object",
      additionalProperties: false,
      required: ["match", "action"],
      properties: {
        match: { type: "string" },
        action: nullable({ type: "string", enum: [...SPECIAL_TYPES] }),
      },
    }),
    question: nullable({
      type: "object",
      additionalProperties: false,
      required: ["measure", "family", "recipient", "category", "payment_method", "period"],
      properties: {
        measure: { type: "string", enum: ["sum", "count", "average", "max"] },
        family: nullable({ type: "string", enum: ["donation", "income", "expense"] }),
        recipient: nullable({ type: "string" }),
        category: nullable({ type: "string" }),
        payment_method: nullable({ type: "string", enum: [...PAYMENTS] }),
        period: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "year", "month", "n", "from", "to", "calendar"],
          properties: {
            kind: { type: "string", enum: ["year", "month", "last_n_months", "range", "all"] },
            year: nullable({ type: "integer" }),
            month: nullable({ type: "integer" }),
            n: nullable({ type: "integer" }),
            from: nullable(dateSchema),
            to: nullable(dateSchema),
            calendar: { type: "string", enum: ["gregorian", "hebrew"] },
          },
        },
      },
    }),
  },
} as const;
