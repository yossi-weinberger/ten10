import { describe, it, expect, vi } from "vitest";

// hebrew-date imports the app i18n instance only for an error message;
// mock it so tests don't boot the full i18next browser stack.
vi.mock("../i18n", () => ({
  default: { t: (key: string) => key },
}));

import {
  getHebrewDate,
  getHebrewMonth,
  getHebrewYear,
  formatHebrewDate,
  formatHebrewDateWithYear,
  convertToGregorianDate,
  isJewishHoliday,
} from "./hebrew-date";

describe("hebrew-date conversions", () => {
  // Oct 3, 2024 = 1 Tishrei 5785 (Rosh Hashana)
  const roshHashana5785 = new Date(2024, 9, 3);
  // Mar 25, 2024 = 15 Adar II 5784 (leap year with Adar I + Adar II)
  const shushanPurim5784 = new Date(2024, 2, 25);

  it("returns the Hebrew year, crossing at Tishrei", () => {
    expect(getHebrewYear(roshHashana5785)).toBe(5785);
    expect(getHebrewYear(new Date(2024, 9, 2))).toBe(5784); // one day earlier
  });

  it("returns the Hebrew day of month", () => {
    expect(getHebrewDate(roshHashana5785)).toBe("1");
    expect(getHebrewDate(shushanPurim5784)).toBe("15");
  });

  it("handles Adar II in leap years", () => {
    expect(getHebrewMonth(shushanPurim5784)).toBe("Adar II");
  });

  it("formats day + month (+ year)", () => {
    expect(formatHebrewDate(roshHashana5785)).toBe("1 Tishrei");
    expect(formatHebrewDateWithYear(roshHashana5785)).toBe("1 Tishrei 5785");
  });

  it("round-trips Hebrew -> Gregorian (15 Nisan 5784 = Pesach, Apr 23 2024)", () => {
    const greg = convertToGregorianDate(5784, "Nisan", 15);
    expect(greg.getFullYear()).toBe(2024);
    expect(greg.getMonth()).toBe(3); // April
    expect(greg.getDate()).toBe(23);
  });

  it("throws on an invalid Hebrew month name", () => {
    expect(() => convertToGregorianDate(5784, "NotAMonth", 1)).toThrow();
  });

  it("detects holidays", () => {
    expect(isJewishHoliday(roshHashana5785)).toBe(true);
    expect(isJewishHoliday(new Date(2024, 10, 5))).toBe(false); // 4 Cheshvan — plain day
  });
});
