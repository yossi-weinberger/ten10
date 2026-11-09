import {
  hebrewDaysInMonth,
  hebrewFromIsoDate,
  hebrewToIsoDate,
} from "./hebrew-calendar.ts";
import { getCalendarAdapter } from "./index.ts";

const HEBREW_MONTH_PATTERNS = {
  he: {
    common: [
      { names: ["תשרי", "tishrei"], month: 1 },
      { names: ["חשוון", "חשון", "heshvan", "marcheshvan"], month: 2 },
      { names: ["כסלו", "kislev"], month: 3 },
      { names: ["טבת", "tevet"], month: 4 },
      { names: ["שבט", "shevat"], month: 5 },
      { names: ["אדר", "adar"], month: 6 },
      { names: ["ניסן", "nisan"], month: 7 },
      { names: ["אייר", "אִיָּר", "iyar"], month: 8 },
      { names: ["סיוון", "סיון", "sivan"], month: 9 },
      { names: ["תמוז", "tamuz"], month: 10 },
      { names: ["אב", "av"], month: 11 },
      { names: ["אלול", "elul"], month: 12 },
    ],
    leap: [
      { names: ["אדר א'", "אדר א", "אדר 1", "adar i", "adar 1"], month: 6 },
      { names: ["אדר ב'", "אדר ב", "אדר 2", "adar ii", "adar 2"], month: 7 },
    ],
  },
};

/**
 * Parse a Hebrew month name from text and return the Gregorian date range.
 * 
 * @param text - The text containing a Hebrew month name (e.g. "תשרי", "בתשרי", "תשרי תשפ\"ז")
 * @param today - Today's date in ISO format (YYYY-MM-DD)
 * @returns The Gregorian date range { from, to } or null if no match
 */
export function parseHebrewMonthPeriod(
  text: string,
  today: string,
): { from: string; to: string } | null {
  if (!text || !text.trim()) return null;

  // Strip common prefixes (ב, ל)
  let normalized = text.trim();
  if (normalized.startsWith("ב")) {
    normalized = normalized.slice(1);
  } else if (normalized.startsWith("ל")) {
    normalized = normalized.slice(1);
  }

  // Try to parse an explicit year from the end
  let explicitYear: number | null = null;
  const yearMatch = normalized.match(/\s+([\d]{4})\s*$/);
  if (yearMatch) {
    const yearStr = yearMatch[1];
    const numericYear = parseInt(yearStr, 10);
    if (numericYear >= 5700 && numericYear <= 6000) {
      explicitYear = numericYear;
      normalized = normalized.slice(0, yearMatch.index).trim();
    }
  }

  normalized = normalized.toLowerCase().trim();

  // Try to match month name
  let matchedMonth: number | null = null;
  let isLeapMonth = false;

  // Check leap year months first (Adar I/II)
  for (const pattern of HEBREW_MONTH_PATTERNS.he.leap) {
    if (pattern.names.some(name => normalized === name.toLowerCase() || normalized.includes(name.toLowerCase()))) {
      matchedMonth = pattern.month;
      isLeapMonth = true;
      break;
    }
  }

  // Check common months
  if (matchedMonth === null) {
    for (const pattern of HEBREW_MONTH_PATTERNS.he.common) {
      if (pattern.names.some(name => normalized === name.toLowerCase() || normalized.includes(name.toLowerCase()))) {
        matchedMonth = pattern.month;
        break;
      }
    }
  }

  if (matchedMonth === null) return null;

  // Helper to check if a Hebrew year is a leap year
  const isHebrewLeapYear = (year: number): boolean => {
    // A leap year in the Hebrew calendar occurs in years 3, 6, 8, 11, 14, 17, and 19 of a 19-year cycle
    return ((year * 7 + 1) % 19) < 7;
  };

  // Determine the year
  const todayHebrew = hebrewFromIsoDate(today);
  let targetYear: number;

  if (explicitYear !== null) {
    targetYear = explicitYear;
  } else {
    // Default: most recent occurrence not in the future
    targetYear = todayHebrew.year;
    
    // Check if this month in the current year is in the future
    try {
      const currentYearStartIso = hebrewToIsoDate({ year: targetYear, month: matchedMonth, day: 1 }, "constrain");
      if (currentYearStartIso > today) {
        // Use previous year
        targetYear = targetYear - 1;
      }
    } catch {
      // If month doesn't exist in current year (e.g. Adar II in non-leap year), try previous year
      targetYear = targetYear - 1;
    }
  }

  // Handle Adar in non-leap years
  const isLeapYearTarget = isHebrewLeapYear(targetYear);
  if (matchedMonth === 6 && !isLeapMonth && !isLeapYearTarget) {
    // Single Adar in non-leap year
    matchedMonth = 6;
  } else if (matchedMonth === 6 && isLeapMonth && !isLeapYearTarget) {
    // Adar I requested but year is not a leap year - use the single Adar
    matchedMonth = 6;
  } else if (matchedMonth === 7 && isLeapMonth && !isLeapYearTarget) {
    // Adar II requested but year is not a leap year - use the single Adar
    matchedMonth = 6;
  }

  // Get the month bounds
  try {
    const adapter = getCalendarAdapter("hebrew");
    const firstDayIso = hebrewToIsoDate({ year: targetYear, month: matchedMonth, day: 1 }, "constrain");
    const from = adapter.startOfMonth(firstDayIso);
    const to = adapter.endOfMonth(firstDayIso);
    return { from, to };
  } catch {
    return null;
  }
}
