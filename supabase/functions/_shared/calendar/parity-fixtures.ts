import {
  getCalendarAdapter,
  type CalendarFormatStyle,
  type CalendarLanguage,
  type CalendarType,
} from "./index.ts";

export interface CalendarParityFixture {
  calendarType: CalendarType;
  isoDate: string;
  language: CalendarLanguage;
  style: CalendarFormatStyle;
}

export const CALENDAR_PARITY_FIXTURES: readonly CalendarParityFixture[] = [
  {
    calendarType: "gregorian",
    isoDate: "2024-02-29",
    language: "en",
    style: "numeric",
  },
  {
    calendarType: "hebrew",
    isoDate: "2026-09-12",
    language: "he",
    style: "long",
  },
  {
    calendarType: "hebrew",
    isoDate: "2027-03-10",
    language: "en",
    style: "long",
  },
] as const;

export const CALENDAR_PARITY_EXPECTED = [
  {
    representation: {
      calendarType: "gregorian",
      isoDate: "2024-02-29",
      year: 2024,
      month: 2,
      monthCode: "M02",
      day: 29,
      inLeapYear: true,
      monthsInYear: 12,
    },
    monthKey: "2024-02",
    monthLabel: "February 2024",
    formatted: "02/29/2024",
  },
  {
    representation: {
      calendarType: "hebrew",
      isoDate: "2026-09-12",
      year: 5787,
      month: 1,
      monthCode: "M01",
      day: 1,
      inLeapYear: true,
      monthsInYear: 13,
    },
    monthKey: "5787-01",
    monthLabel: "תשרי 5787",
    formatted: "1 בתשרי 5787",
  },
  {
    representation: {
      calendarType: "hebrew",
      isoDate: "2027-03-10",
      year: 5787,
      month: 7,
      monthCode: "M06",
      day: 1,
      inLeapYear: true,
      monthsInYear: 13,
    },
    monthKey: "5787-07",
    monthLabel: "Adar II 5787",
    formatted: "1 Adar II 5787",
  },
] as const;

export function evaluateCalendarFixtures(
  fixtures: readonly CalendarParityFixture[],
) {
  return fixtures.map((fixture) => {
    const adapter = getCalendarAdapter(fixture.calendarType);
    const monthKey = adapter.monthKey(fixture.isoDate);
    return {
      representation: adapter.fromIsoDate(fixture.isoDate),
      monthKey,
      monthLabel: adapter.monthLabel(monthKey, fixture.language),
      formatted: adapter.formatDate(
        fixture.isoDate,
        fixture.language,
        fixture.style,
      ),
    };
  });
}
