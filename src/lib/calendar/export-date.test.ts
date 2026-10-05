import { describe, expect, it } from "vitest";
import { formatExportDate } from "@/lib/calendar/export-date";

describe("formatExportDate", () => {
  it("keeps Gregorian output only for the default settings", () => {
    expect(
      formatExportDate("2026-09-12", {
        calendarType: "gregorian",
        showSecondaryDate: false,
        language: "en",
      }),
    ).toEqual({ gregorian: "12/09/2026" });
  });

  it.each([
    ["hebrew", false],
    ["gregorian", true],
    ["hebrew", true],
  ] as const)(
    "adds Hebrew output for %s primary with secondary=%s",
    (calendarType, showSecondaryDate) => {
      expect(
        formatExportDate("2027-03-10", {
          calendarType,
          showSecondaryDate,
          language: "en",
        }),
      ).toMatchObject({
        gregorian: "10/03/2027",
        hebrew: "א׳ Adar II תשפ״ז",
      });
    },
  );
});
