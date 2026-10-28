import {
  firstRecurringDueDate,
  getCalendarAdapter,
  type CalendarType,
  type RecurrenceFrequency,
} from "../calendar/index.ts";
import type { RateSource } from "./currency-rules.ts";
import type { SupportedCurrencyCode } from "./normalize-core.ts";
import type { TransactionType } from "./transaction-types.ts";

export interface RecurringDefinitionInput {
  start_date: string;
  frequency?: RecurrenceFrequency;
  calendar_type?: CalendarType;
  day_of_month?: number | null;
  total_occurrences?: number;
  amount: number;
  currency: SupportedCurrencyCode;
  description?: string | null;
  type: TransactionType;
  category?: string | null;
  is_chomesh?: boolean | null;
  recipient?: string | null;
  /** Already normalized by the caller. */
  payment_method?: string | null;
  original_amount?: number | null;
  original_currency?: SupportedCurrencyCode | null;
  conversion_rate?: number | null;
  conversion_date?: string | null;
  rate_source?: RateSource | null;
}

/** A row for recurring_transactions, without the fields the DB fills. */
export interface RecurringDefinition {
  start_date: string;
  next_due_date: string;
  frequency: RecurrenceFrequency;
  calendar_type: CalendarType;
  anchor_month_code: string | null;
  day_of_month: number;
  total_occurrences?: number;
  amount: number;
  currency: SupportedCurrencyCode;
  description?: string;
  type: TransactionType;
  category?: string;
  is_chomesh?: boolean;
  recipient?: string;
  payment_method?: string;
  original_amount?: number;
  original_currency?: SupportedCurrencyCode;
  conversion_rate?: number;
  conversion_date?: string;
  rate_source?: RateSource;
}

/**
 * Without day_of_month, the day is the Gregorian day number of start_date,
 * also for the Hebrew calendar.
 */
export function buildRecurringDefinition(
  input: RecurringDefinitionInput,
): RecurringDefinition {
  const calendarType = input.calendar_type ?? "gregorian";
  const dayOfMonth = input.day_of_month ??
    getCalendarAdapter("gregorian").fromIsoDate(input.start_date).day;
  const anchorMonthCode = input.frequency === "yearly"
    ? getCalendarAdapter(calendarType).fromIsoDate(input.start_date).monthCode
    : null;

  return {
    start_date: input.start_date,
    next_due_date: firstRecurringDueDate(
      input.start_date,
      calendarType,
      dayOfMonth,
    ),
    frequency: input.frequency ?? "monthly",
    calendar_type: calendarType,
    anchor_month_code: anchorMonthCode,
    day_of_month: dayOfMonth,
    total_occurrences: input.total_occurrences,
    amount: input.amount,
    currency: input.currency,
    description: input.description ?? undefined,
    type: input.type,
    category: input.category ?? undefined,
    is_chomesh: input.is_chomesh ?? undefined,
    recipient: input.recipient ?? undefined,
    payment_method: input.payment_method ?? undefined,
    original_amount: input.original_amount ?? undefined,
    original_currency: input.original_currency ?? undefined,
    conversion_rate: input.conversion_rate ?? undefined,
    conversion_date: input.conversion_date ?? undefined,
    rate_source: input.rate_source ?? undefined,
  };
}
