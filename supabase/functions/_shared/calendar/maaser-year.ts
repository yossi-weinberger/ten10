import { Temporal } from "temporal-polyfill/full";
import { getCalendarAdapter } from "./index.ts";

export interface MaaserYearRange {
  hebrewYear: number;
  startDate: string;
  endDate: string;
  openingAsOfDate: string;
}

const hebrewCalendar = getCalendarAdapter("hebrew");

function addCalendarDays(isoDate: string, amount: number): string {
  return Temporal.PlainDate.from(isoDate).add({ days: amount }).toString();
}

export function getHebrewYear(isoDate: string): number {
  return hebrewCalendar.fromIsoDate(isoDate).year;
}

export function getMaaserYearRange(hebrewYear: number): MaaserYearRange {
  if (!Number.isInteger(hebrewYear) || hebrewYear < 1) {
    throw new RangeError(`Invalid Hebrew year: ${hebrewYear}`);
  }

  const startDate = hebrewCalendar.toIsoDate(
    { year: hebrewYear, month: 1, day: 1 },
    "reject",
  );
  const nextStartDate = hebrewCalendar.toIsoDate(
    { year: hebrewYear + 1, month: 1, day: 1 },
    "reject",
  );
  const endDate = addCalendarDays(nextStartDate, -1);

  return {
    hebrewYear,
    startDate,
    endDate,
    openingAsOfDate: addCalendarDays(startDate, -1),
  };
}

export function getCurrentMaaserYear(today: string): number {
  return getHebrewYear(today);
}

export function getErevRoshHashanah(hebrewYear: number): string {
  return getMaaserYearRange(hebrewYear).endDate;
}

export function isErevRoshHashanah(isoDate: string): boolean {
  const { month, day, monthsInYear } = hebrewCalendar.fromIsoDate(isoDate);
  return month === monthsInYear && day === hebrewCalendar.daysInMonth(
    getHebrewYear(isoDate),
    monthsInYear,
  );
}

export function isMaaserYearCloseWindow(isoDate: string): boolean {
  const { year, month, day, monthsInYear } = hebrewCalendar.fromIsoDate(isoDate);
  if (month === monthsInYear && day >= 16) {
    return true;
  }

  return month === 1 && day <= 7 && getMaaserYearRange(year).startDate <= isoDate;
}

export function clampMaaserYearReportEnd(
  range: MaaserYearRange,
  today: string,
): string {
  if (today < range.startDate) {
    return range.startDate;
  }

  return today < range.endDate ? today : range.endDate;
}
