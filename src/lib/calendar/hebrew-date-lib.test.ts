import { DateLib } from "react-day-picker";
import { describe, expect, it } from "vitest";

import {
  createHebrewDateLib,
  formatHebrewCalendarCaption,
  formatHebrewCalendarMonth,
} from "@/lib/calendar/hebrew-date-lib";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/local-date";

const dateLib = new DateLib({}, createHebrewDateLib("en"));

describe("Hebrew DayPicker DateLib", () => {
  it("constructs Hebrew dates and exposes their civil month and year", () => {
    const date = dateLib.newDate(5787, 0, 1);

    expect(formatLocalDate(date)).toBe("2026-09-12");
    expect(dateLib.getMonth(date)).toBe(0);
    expect(dateLib.getYear(date)).toBe(5787);
  });

  it("uses actual Hebrew month boundaries", () => {
    const tishrei = parseLocalDate("2026-09-21");

    expect(formatLocalDate(dateLib.startOfMonth(tishrei))).toBe("2026-09-12");
    expect(formatLocalDate(dateLib.endOfMonth(tishrei))).toBe("2026-10-11");
    expect(
      dateLib.isSameMonth(
        parseLocalDate("2026-09-12"),
        parseLocalDate("2026-10-11"),
      ),
    ).toBe(true);
    expect(
      dateLib.isSameMonth(
        parseLocalDate("2026-10-11"),
        parseLocalDate("2026-10-12"),
      ),
    ).toBe(false);
  });

  it("navigates and measures Hebrew months across year boundaries", () => {
    const elul = parseLocalDate("2026-09-11");
    const tishrei = dateLib.addMonths(elul, 1);

    expect(formatLocalDate(tishrei)).toBe("2026-10-10");
    expect(dateLib.differenceInCalendarMonths(tishrei, elul)).toBe(1);
    expect(dateLib.differenceInCalendarMonths(elul, tishrei)).toBe(-1);
  });

  it("enumerates 13 leap-year months and 12 simple-year months", () => {
    const leapMonths = dateLib.eachMonthOfInterval({
      start: dateLib.newDate(5787, 0, 1),
      end: dateLib.endOfYear(dateLib.newDate(5787, 0, 1)),
    });
    const simpleMonths = dateLib.eachMonthOfInterval({
      start: dateLib.newDate(5788, 0, 1),
      end: dateLib.endOfYear(dateLib.newDate(5788, 0, 1)),
    });

    expect(leapMonths).toHaveLength(13);
    expect(leapMonths.map((date) => dateLib.getMonth(date))).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(simpleMonths).toHaveLength(12);
  });

  it("normalizes Adar I when changing to a simple year", () => {
    const adarI = dateLib.newDate(5787, 5, 15);
    const normalized = dateLib.setYear(adarI, 5788);

    expect(dateLib.getYear(normalized)).toBe(5788);
    expect(dateLib.getMonth(normalized)).toBe(5);
  });

  it("formats localized captions and dropdown month names", () => {
    const tishrei = parseLocalDate("2026-09-12");

    expect(formatHebrewCalendarCaption(tishrei, "he")).toContain("תשרי");
    expect(formatHebrewCalendarCaption(tishrei, "en")).toContain("Tishri");
    expect(formatHebrewCalendarMonth(tishrei, "he")).toBe("תשרי");
    expect(formatHebrewCalendarMonth(tishrei, "en")).toBe("Tishri");
    expect(dateLib.format(tishrei, "d")).toBe("1");
    expect(dateLib.format(tishrei, "yyyy-MM-dd")).toBe("2026-09-12");
  });
});
