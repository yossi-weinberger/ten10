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
    });
  });

  it("preserves valid stored calendar preferences", () => {
    expect(
      normalizeCalendarSettings({
        calendarType: "hebrew",
        showSecondaryDate: true,
      }),
    ).toEqual({
      calendarType: "hebrew",
      showSecondaryDate: true,
    });
  });

  it("replaces invalid persisted values with safe defaults", () => {
    expect(
      normalizeCalendarSettings({
        calendarType: "julian",
        showSecondaryDate: "yes",
      }),
    ).toEqual({
      calendarType: "gregorian",
      showSecondaryDate: false,
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
