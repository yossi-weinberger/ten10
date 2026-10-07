import { describe, expect, it } from "vitest";
import { formatDisplayDate } from "@/lib/calendar/display-date";

describe("formatDisplayDate", () => {
  it("preserves the Gregorian DD/MM/YYYY display contract", () => {
    expect(
      formatDisplayDate("2026-09-12", {
        calendarType: "gregorian",
        showSecondaryDate: false,
        language: "en",
        style: "numeric",
      }),
    ).toEqual({ primary: "12/09/2026" });
  });

  it.each([
    ["he", "א׳ בתשרי תשפ״ז"],
    ["en", "א׳ Tishrei תשפ״ז"],
  ] as const)("localizes Hebrew long output in %s", (language, primary) => {
    expect(
      formatDisplayDate("2026-09-12", {
        calendarType: "hebrew",
        showSecondaryDate: false,
        language,
        style: "long",
      }),
    ).toEqual({ primary });
  });

  it("adds Hebrew as the secondary display", () => {
    expect(
      formatDisplayDate("2026-09-12", {
        calendarType: "gregorian",
        showSecondaryDate: true,
        language: "en",
        style: "numeric",
      }),
    ).toEqual({
      primary: "12/09/2026",
      secondary: "א׳ Tishrei תשפ״ז",
    });
  });

  it("uses a localized readable Hebrew date for numeric display seams", () => {
    expect(
      formatDisplayDate("2026-09-12", {
        calendarType: "hebrew",
        showSecondaryDate: false,
        language: "en",
        style: "numeric",
      }),
    ).toEqual({ primary: "א׳ Tishrei תשפ״ז" });
  });

  it("adds Gregorian as the secondary display", () => {
    expect(
      formatDisplayDate("2027-02-10", {
        calendarType: "hebrew",
        showSecondaryDate: true,
        language: "en",
        style: "long",
      }),
    ).toEqual({
      primary: "ג׳ Adar I תשפ״ז",
      secondary: "10/02/2027",
    });
  });

  it("formats short dates with a two-digit Gregorian year", () => {
    expect(
      formatDisplayDate("2026-09-12", {
        calendarType: "gregorian",
        showSecondaryDate: false,
        language: "he",
        style: "short",
      }),
    ).toEqual({ primary: "12/09/26" });
  });

  it.each([
    ["day-month-year", "numeric", "12/09/2026"],
    ["month-day-year", "numeric", "09/12/2026"],
    ["month-day-year", "short", "09/12/26"],
    ["written", "numeric", "Sep 12, 2026"],
  ] as const)(
    "formats Gregorian %s dates in %s style",
    (gregorianDateFormat, style, primary) => {
      expect(
        formatDisplayDate("2026-09-12", {
          calendarType: "gregorian",
          showSecondaryDate: false,
          language: "en",
          style,
          gregorianDateFormat,
        }),
      ).toEqual({ primary });
    },
  );

  it.each([
    ["mixed", "א׳ Tishrei תשפ״ז"],
    ["numbers", "1 Tishrei 5787"],
    ["letters", "א׳ תשרי תשפ״ז"],
  ] as const)(
    "formats the Hebrew date in English as %s",
    (hebrewEnglishDateFormat, primary) => {
      expect(
        formatDisplayDate("2026-09-12", {
          calendarType: "hebrew",
          showSecondaryDate: false,
          language: "en",
          style: "long",
          hebrewEnglishDateFormat,
        }),
      ).toEqual({ primary });
    },
  );

  it("keeps the Hebrew UI format when an English Hebrew format is set", () => {
    expect(
      formatDisplayDate("2026-09-12", {
        calendarType: "hebrew",
        showSecondaryDate: false,
        language: "he",
        style: "long",
        hebrewEnglishDateFormat: "numbers",
      }),
    ).toEqual({ primary: "א׳ בתשרי תשפ״ז" });
  });

  it("applies both formats to the primary and secondary dates", () => {
    expect(
      formatDisplayDate("2027-02-10", {
        calendarType: "gregorian",
        showSecondaryDate: true,
        language: "en",
        style: "numeric",
        gregorianDateFormat: "month-day-year",
        hebrewEnglishDateFormat: "numbers",
      }),
    ).toEqual({
      primary: "02/10/2027",
      secondary: "3 Adar I 5787",
    });
  });

  it.each(["", "not-a-date"])(
    "preserves empty or malformed caller values: %s",
    (isoDate) => {
      expect(
        formatDisplayDate(isoDate, {
          calendarType: "hebrew",
          showSecondaryDate: true,
          language: "he",
          style: "long",
        }),
      ).toEqual({ primary: isoDate });
    },
  );
});
