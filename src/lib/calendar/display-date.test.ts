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
    ["en", "א׳ Tishri תשפ״ז"],
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
      secondary: "א׳ Tishri תשפ״ז",
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
    ).toEqual({ primary: "א׳ Tishri תשפ״ז" });
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
