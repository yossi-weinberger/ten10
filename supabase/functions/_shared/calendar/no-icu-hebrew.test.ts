import { afterEach, describe, expect, it, vi } from "vitest";
import { planReminderRun } from "../../send-reminder-emails/reminder-run-date.ts";
import { getCalendarAdapter } from "./index.ts";

describe("Hebrew calendar without ICU", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("converts and formats Hebrew dates when Intl hebrew is unavailable", () => {
    const Original = Intl.DateTimeFormat;
    const FakeDateTimeFormat = function (
      this: Intl.DateTimeFormat,
      locales?: string | string[],
      options?: Intl.DateTimeFormatOptions,
    ) {
      if (options?.calendar === "hebrew") {
        throw new RangeError("Invalid calendar : hebrew");
      }
      return new Original(locales, options);
    } as unknown as typeof Intl.DateTimeFormat;
    FakeDateTimeFormat.supportedLocalesOf = Original.supportedLocalesOf.bind(
      Original,
    );

    vi.stubGlobal("Intl", {
      ...Intl,
      DateTimeFormat: FakeDateTimeFormat,
      supportedValuesOf(key: string) {
        if (key === "calendar") {
          return ["gregory", "iso8601"];
        }
        return Intl.supportedValuesOf?.(key) ?? [];
      },
    });

    const hebrew = getCalendarAdapter("hebrew");
    expect(hebrew.fromIsoDate("2026-09-12")).toMatchObject({
      year: 5787,
      month: 1,
      monthCode: "M01",
      day: 1,
    });
    expect(hebrew.formatDate("2026-09-12", "he", "long")).toBe(
      "א׳ בתשרי תשפ״ז",
    );
    expect(hebrew.monthLabel("5787-07", "en")).toContain("Adar II");

    const skip = planReminderRun("2026-10-03");
    expect(skip.fallback).toMatchObject({
      kind: "skip",
      reason: "yom-tov-and-shabbat",
    });

    const day20 = planReminderRun("2026-10-20");
    expect(day20.fallback).toEqual({
      kind: "send-today",
      reminderDay: 20,
    });
  });
});
