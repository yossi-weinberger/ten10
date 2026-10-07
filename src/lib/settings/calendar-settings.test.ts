import { describe, expect, it } from "vitest";
import {
  normalizeCalendarSettings,
  shouldResetCalendarChartCache,
} from "./calendar-settings";

describe("calendar settings migration", () => {
  it("defaults old stores to Gregorian without a secondary date", () => {
    expect(normalizeCalendarSettings({})).toEqual({
      calendarType: "gregorian",
      showSecondaryDate: false,
      gregorianDateFormat: "day-month-year",
      hebrewEnglishDateFormat: "mixed",
    });
  });

  it("preserves valid stored calendar preferences", () => {
    expect(
      normalizeCalendarSettings({
        calendarType: "hebrew",
        showSecondaryDate: true,
        gregorianDateFormat: "written",
        hebrewEnglishDateFormat: "letters",
      }),
    ).toEqual({
      calendarType: "hebrew",
      showSecondaryDate: true,
      gregorianDateFormat: "written",
      hebrewEnglishDateFormat: "letters",
    });
  });

  it("replaces invalid persisted values with safe defaults", () => {
    expect(
      normalizeCalendarSettings({
        calendarType: "julian",
        showSecondaryDate: "yes",
        gregorianDateFormat: "yyyy-mm-dd",
        hebrewEnglishDateFormat: 7,
      }),
    ).toEqual({
      calendarType: "gregorian",
      showSecondaryDate: false,
      gregorianDateFormat: "day-month-year",
      hebrewEnglishDateFormat: "mixed",
    });
  });
});

describe("calendar chart cache transition", () => {
  it("resets only when the primary calendar changes", () => {
    expect(
      shouldResetCalendarChartCache(
        { calendarType: "gregorian" },
        { calendarType: "hebrew" },
      ),
    ).toBe(true);
    expect(
      shouldResetCalendarChartCache(
        { calendarType: "gregorian" },
        { showSecondaryDate: true },
      ),
    ).toBe(false);
    expect(
      shouldResetCalendarChartCache(
        { calendarType: "gregorian" },
        { calendarType: "gregorian" },
      ),
    ).toBe(false);
  });
});
