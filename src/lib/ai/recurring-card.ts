import {
  addIsoDays,
  advanceRecurringDate,
  firstRecurringDueDate,
  generateRecurringCatchUpDates,
  getCalendarAdapter,
  type CalendarType,
  type RecurrenceFrequency,
  type RecurrenceRule,
} from "@/lib/calendar";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";

export function cardFromRecurringDraft(draft: {
  amount: number | null;
  currency: RecurringCard["currency"];
  type: RecurringCard["type"];
  description: string | null;
  category: RecurringCard["category"];
  paymentMethod: RecurringCard["paymentMethod"];
  frequency: RecurringCard["frequency"];
  calendarType: RecurringCard["calendarType"];
  startDate: string | null;
  dayOfMonth: number | null;
  anchorMonthCode: string | null;
  totalOccurrences: number | null;
  alreadyCharged: boolean;
}): RecurringCard {
  return {
    amount: draft.amount,
    currency: draft.currency,
    type: draft.type,
    description: draft.description ?? "",
    category: draft.category,
    paymentMethod: draft.paymentMethod,
    recipient: "",
    frequency: draft.frequency,
    calendarType: draft.calendarType,
    startDate: draft.startDate,
    dayOfMonth: draft.dayOfMonth,
    anchorMonthCode: draft.anchorMonthCode,
    totalOccurrences: draft.totalOccurrences,
    alreadyCharged: draft.alreadyCharged,
    includeThisMonth: null,
    monthDuplicate: false,
    saved: false,
    savedId: null,
    savedCreatedAt: null,
    executionCount: 0,
    cancelled: false,
  };
}

export interface RecurringCard {
  amount: number | null;
  currency: TextTransactionDraft["currency"] | null;
  type: TextTransactionDraft["type"] | null;
  description: string;
  category: TextTransactionDraft["category"];
  paymentMethod: TextTransactionDraft["paymentMethod"];
  recipient: string;
  frequency: RecurrenceFrequency | null;
  calendarType: CalendarType;
  startDate: string | null;
  dayOfMonth: number | null;
  anchorMonthCode: string | null;
  totalOccurrences: number | null;
  alreadyCharged: boolean;
  includeThisMonth: "yes" | "no" | null;
  monthDuplicate: boolean;
  saved: boolean;
  savedId: string | null;
  savedCreatedAt: string | null;
  executionCount: number;
  cancelled: boolean;
}

const CANCEL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type RecurringQuestion = "amount" | "currency" | "type" | "frequency" | "day" | "includeThisMonth";

export const RECURRING_EDIT_FIELDS = [
  "amount",
  "currency",
  "type",
  "description",
  "recipient",
  "category",
  "day",
  "start",
  "count",
] as const;

export type RecurringEditField = (typeof RECURRING_EDIT_FIELDS)[number];

export type RecurringSummaryPiece = {
  field: "type" | "amount" | "description" | "day" | "start" | null;
  text: string;
};

/**
 * Daily, weekly, and yearly are recognized and refused.
 * They are not turned into a monthly order.
 *
 * TODO(recurring-frequencies): when weekly/yearly are enabled in the form, also enable them in the AI recurring flow (recurring-card.ts + intent/extraction prompt) and update tests.
 */
export function unsupportedRecurringFrequency(
  frequency: RecurrenceFrequency | null,
): frequency is "daily" | "weekly" | "yearly" {
  return frequency === "daily" || frequency === "weekly" || frequency === "yearly";
}

/** The one missing answer, in order. Null when the card can show the summary. */
export function nextRecurringQuestion(card: RecurringCard): RecurringQuestion | null {
  if (card.saved || unsupportedRecurringFrequency(card.frequency)) return null;
  if (card.amount === null || !(card.amount > 0)) return "amount";
  if (card.currency === null) return "currency";
  if (card.type === null) return "type";
  if (card.frequency === null) return "frequency";
  if (card.startDate === null) return "day";
  if (card.alreadyCharged && card.includeThisMonth === null) return "includeThisMonth";
  return null;
}

/** Day and month in the card's calendar, without a year. Gregorian 2026-11-10 is "10/11". */
export function recurringShortDate(iso: string, calendarType: CalendarType): string {
  const representation = getCalendarAdapter(calendarType).fromIsoDate(iso);
  return `${representation.day}/${representation.month}`;
}

export function recurringSummaryPieces(
  card: RecurringCard,
  labels: {
    type: string;
    currency: string;
    start: string;
    lead: string;
    payeePrefix: string;
    monthly: string;
    from: string;
  },
): RecurringSummaryPiece[] {
  const pieces: RecurringSummaryPiece[] = [
    { field: null, text: labels.lead },
    { field: "type", text: labels.type },
    { field: null, text: " " },
    { field: "amount", text: `${card.amount ?? ""} ${labels.currency}` },
  ];
  const payee = card.description.trim();
  if (payee) {
    pieces.push({ field: null, text: labels.payeePrefix }, { field: "description", text: payee });
  }
  pieces.push(
    { field: null, text: labels.monthly },
    { field: "day", text: String(card.dayOfMonth ?? "") },
    { field: null, text: labels.from },
    { field: "start", text: labels.start },
  );
  return pieces;
}

export function recurringSummarySentence(
  card: RecurringCard,
  labels: {
    type: string;
    currency: string;
    start: string;
    lead: string;
    payeePrefix: string;
    monthly: string;
    from: string;
  },
): string {
  return recurringSummaryPieces(card, labels).map((piece) => piece.text).join("");
}

/** The assistant cancel button stays up for 7 days, and only before the first charge. */
export function recurringCancelOpen(createdAt: string, executionCount: number, now: Date): boolean {
  if (executionCount !== 0) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now.getTime() >= created && now.getTime() - created < CANCEL_WINDOW_MS;
}

function dayOf(card: RecurringCard): number | null {
  if (card.dayOfMonth !== null) return card.dayOfMonth;
  if (!card.startDate) return null;
  return getCalendarAdapter(card.calendarType).fromIsoDate(card.startDate).day;
}

export function recurrenceRule(card: RecurringCard): RecurrenceRule | null {
  const day = dayOf(card);
  if (!card.frequency || day === null) return null;
  return {
    frequency: card.frequency,
    calendarType: card.calendarType,
    dayOfMonth: day,
    anchorMonthCode: card.anchorMonthCode,
  };
}

/** The next charges, at most three, and fewer when the order ends sooner. */
export function upcomingRecurringDates(card: RecurringCard, limit = 3): string[] {
  if (!card.startDate) return [];
  const rule = recurrenceRule(card);
  if (!rule) return [];
  const count = card.totalOccurrences === null ? limit : Math.min(limit, card.totalOccurrences);
  if (count <= 0) return [];
  const dates: string[] = [];
  let due = firstRecurringDueDate(card.startDate, card.calendarType, rule.dayOfMonth);
  while (dates.length < count) {
    dates.push(due);
    due = advanceRecurringDate(due, rule);
  }
  return dates;
}

function lookbackDays(frequency: RecurrenceFrequency): number {
  switch (frequency) {
    case "daily":
      return 2;
    case "weekly":
      return 14;
    case "monthly":
      return 40;
    case "yearly":
      return 400;
    default: {
      const never: never = frequency;
      return never;
    }
  }
}

/** Latest due date on or before today. Null when the schedule cannot be read. */
export function currentPeriodDueDate(card: RecurringCard, today: string): string | null {
  const rule = recurrenceRule(card);
  if (!rule) return null;
  const origin = firstRecurringDueDate(
    addIsoDays(today, -lookbackDays(rule.frequency)),
    card.calendarType,
    rule.dayOfMonth,
  );
  const caught = generateRecurringCatchUpDates(origin, today, rule);
  return caught.length > 0 ? caught[caught.length - 1] : null;
}

/** Start date written on save. Including this month uses the current period. */
export function saveStartDate(card: RecurringCard, today: string): string | null {
  if (card.includeThisMonth === "yes") return currentPeriodDueDate(card, today);
  if (card.includeThisMonth === "no" && card.alreadyCharged) {
    const rule = recurrenceRule(card);
    const current = currentPeriodDueDate(card, today);
    if (!rule || !current) return card.startDate;
    if (card.startDate && card.startDate > current) return card.startDate;
    return advanceRecurringDate(current, rule);
  }
  return card.startDate;
}

export function recurringCardReady(card: RecurringCard, today: string): boolean {
  if (card.saved || card.monthDuplicate) return false;
  if (card.frequency !== "monthly") return false;
  if (card.alreadyCharged && card.includeThisMonth === null) return false;
  return (
    card.amount !== null &&
    card.amount > 0 &&
    card.currency !== null &&
    card.type !== null &&
    saveStartDate(card, today) !== null
  );
}

export function withRecurringDay(card: RecurringCard, day: number, today: string): RecurringCard {
  return {
    ...card,
    dayOfMonth: day,
    startDate: firstRecurringDueDate(today, card.calendarType, day),
    monthDuplicate: false,
  };
}

export function withRecurringStart(card: RecurringCard, startDate: string): RecurringCard {
  const adapter = getCalendarAdapter(card.calendarType);
  const representation = adapter.fromIsoDate(startDate);
  return {
    ...card,
    startDate,
    dayOfMonth: representation.day,
    anchorMonthCode: card.frequency === "yearly" ? representation.monthCode : card.anchorMonthCode,
    monthDuplicate: false,
  };
}

export function withRecurringFrequency(
  card: RecurringCard,
  frequency: RecurrenceFrequency,
): RecurringCard {
  const anchor = frequency === "yearly" && card.startDate
    ? getCalendarAdapter(card.calendarType).fromIsoDate(card.startDate).monthCode
    : null;
  return { ...card, frequency, anchorMonthCode: anchor, monthDuplicate: false };
}
