import {
  advanceRecurringDate,
  firstRecurringDueDate,
  generateRecurringCatchUpDates,
  getCalendarAdapter,
  rescheduleRecurringBillingDay,
  type CalendarType,
  type RecurrenceRule,
} from "./index.ts";

interface MonthlySequenceFixture {
  kind: "sequence";
  start: string;
  count: number;
  rule: RecurrenceRule;
}

interface AdvanceFixture {
  kind: "advance";
  current: string;
  rule: RecurrenceRule;
}

interface FirstDueFixture {
  kind: "first";
  start: string;
  calendarType: CalendarType;
  dayOfMonth: number;
}

interface RescheduleFixture {
  kind: "reschedule";
  current: string;
  calendarType: CalendarType;
  dayOfMonth: number;
}

interface CatchUpFixture {
  kind: "catchUp";
  current: string;
  through: string;
  rule: RecurrenceRule;
}

type RecurrenceParityFixture =
  | MonthlySequenceFixture
  | AdvanceFixture
  | FirstDueFixture
  | RescheduleFixture
  | CatchUpFixture;

const hebrew = getCalendarAdapter("hebrew");

export const RECURRENCE_PARITY_FIXTURES: readonly RecurrenceParityFixture[] = [
  {
    kind: "sequence",
    start: "2023-12-31",
    count: 24,
    rule: {
      calendarType: "gregorian",
      frequency: "monthly",
      dayOfMonth: 31,
    },
  },
  {
    kind: "sequence",
    start: hebrew.toIsoDate({ year: 5787, month: 1, day: 30 }),
    count: 24,
    rule: {
      calendarType: "hebrew",
      frequency: "monthly",
      dayOfMonth: 30,
    },
  },
  {
    kind: "advance",
    current: "2027-03-08",
    rule: {
      calendarType: "hebrew",
      frequency: "daily",
      dayOfMonth: 30,
    },
  },
  {
    kind: "advance",
    current: "2027-03-08",
    rule: {
      calendarType: "hebrew",
      frequency: "weekly",
      dayOfMonth: 30,
    },
  },
  {
    kind: "sequence",
    start: hebrew.toIsoDate({
      year: 5787,
      monthCode: "M05L",
      day: 15,
    }),
    count: 3,
    rule: {
      calendarType: "hebrew",
      frequency: "yearly",
      dayOfMonth: 15,
      anchorMonthCode: "M05L",
      yearlyNormalization: "constrain",
    },
  },
  {
    kind: "sequence",
    start: hebrew.toIsoDate({
      year: 5787,
      monthCode: "M06",
      day: 15,
    }),
    count: 3,
    rule: {
      calendarType: "hebrew",
      frequency: "yearly",
      dayOfMonth: 15,
      anchorMonthCode: "M06",
      yearlyNormalization: "constrain",
    },
  },
  {
    kind: "first",
    start: "2024-02-29",
    calendarType: "gregorian",
    dayOfMonth: 31,
  },
  {
    kind: "first",
    start: hebrew.toIsoDate({ year: 5787, month: 5, day: 20 }),
    calendarType: "hebrew",
    dayOfMonth: 30,
  },
  {
    kind: "reschedule",
    current: "2026-02-15",
    calendarType: "gregorian",
    dayOfMonth: 31,
  },
  {
    kind: "reschedule",
    current: hebrew.toIsoDate({ year: 5787, month: 6, day: 20 }),
    calendarType: "hebrew",
    dayOfMonth: 30,
  },
  {
    kind: "catchUp",
    current: hebrew.toIsoDate({ year: 5787, month: 5, day: 30 }),
    through: hebrew.toIsoDate({ year: 5787, month: 9, day: 30 }),
    rule: {
      calendarType: "hebrew",
      frequency: "monthly",
      dayOfMonth: 30,
    },
  },
] as const;

export const RECURRENCE_PARITY_COMBINATION_COUNT = 65;

export const RECURRENCE_PARITY_EXPECTED = [
  [
    "2024-01-31",
    "2024-02-29",
    "2024-03-31",
    "2024-04-30",
    "2024-05-31",
    "2024-06-30",
    "2024-07-31",
    "2024-08-31",
    "2024-09-30",
    "2024-10-31",
    "2024-11-30",
    "2024-12-31",
    "2025-01-31",
    "2025-02-28",
    "2025-03-31",
    "2025-04-30",
    "2025-05-31",
    "2025-06-30",
    "2025-07-31",
    "2025-08-31",
    "2025-09-30",
    "2025-10-31",
    "2025-11-30",
    "2025-12-31",
  ],
  [
    "2026-11-10",
    "2026-12-10",
    "2027-01-08",
    "2027-02-07",
    "2027-03-09",
    "2027-04-07",
    "2027-05-07",
    "2027-06-05",
    "2027-07-05",
    "2027-08-03",
    "2027-09-02",
    "2027-10-01",
    "2027-10-31",
    "2027-11-30",
    "2027-12-30",
    "2028-01-28",
    "2028-02-27",
    "2028-03-27",
    "2028-04-26",
    "2028-05-25",
    "2028-06-24",
    "2028-07-23",
    "2028-08-22",
    "2028-09-20",
  ],
  "2027-03-09",
  "2027-03-15",
  ["2028-03-13", "2029-03-02", "2030-02-18"],
  ["2028-03-13", "2029-03-02", "2030-03-20"],
  "2024-02-29",
  "2027-02-07",
  "2026-02-28",
  "2027-03-09",
  [
    "2027-02-07",
    "2027-03-09",
    "2027-04-07",
    "2027-05-07",
    "2027-06-05",
  ],
] as const;

function assertNever(value: never): never {
  throw new Error(`Unsupported recurrence fixture: ${String(value)}`);
}

function evaluateSequence(fixture: MonthlySequenceFixture): string[] {
  const results: string[] = [];
  let current = fixture.start;
  for (let index = 0; index < fixture.count; index += 1) {
    current = advanceRecurringDate(current, fixture.rule);
    results.push(current);
  }
  return results;
}

export function evaluateRecurrenceFixtures(
  fixtures: readonly RecurrenceParityFixture[],
) {
  return fixtures.map((fixture) => {
    switch (fixture.kind) {
      case "sequence":
        return evaluateSequence(fixture);
      case "advance":
        return advanceRecurringDate(fixture.current, fixture.rule);
      case "first":
        return firstRecurringDueDate(
          fixture.start,
          fixture.calendarType,
          fixture.dayOfMonth,
        );
      case "reschedule":
        return rescheduleRecurringBillingDay(
          fixture.current,
          fixture.calendarType,
          fixture.dayOfMonth,
        );
      case "catchUp":
        return generateRecurringCatchUpDates(
          fixture.current,
          fixture.through,
          fixture.rule,
        );
      default:
        return assertNever(fixture);
    }
  });
}
