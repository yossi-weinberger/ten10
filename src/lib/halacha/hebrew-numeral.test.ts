import { describe, expect, it } from "vitest";
import {
  formatHebrewNumeral,
  formatHebrewYear,
  toHebrewNumeral,
} from "./hebrew-numeral";

describe("toHebrewNumeral", () => {
  it("converts common booklet page numbers", () => {
    expect(toHebrewNumeral(1)).toBe("א");
    expect(toHebrewNumeral(10)).toBe("י");
    expect(toHebrewNumeral(12)).toBe("יב");
    expect(toHebrewNumeral(15)).toBe("טו");
    expect(toHebrewNumeral(16)).toBe("טז");
    expect(toHebrewNumeral(21)).toBe("כא");
  });
});

describe("formatHebrewNumeral", () => {
  it("marks a single letter with geresh and 15/16 without the divine name", () => {
    expect(formatHebrewNumeral(1)).toBe("א׳");
    expect(formatHebrewNumeral(10)).toBe("י׳");
    expect(formatHebrewNumeral(15)).toBe("ט״ו");
    expect(formatHebrewNumeral(16)).toBe("ט״ז");
    expect(formatHebrewNumeral(30)).toBe("ל׳");
  });
});

describe("formatHebrewYear", () => {
  it("adds gershayim before the last letter", () => {
    expect(formatHebrewYear(5787)).toBe("תשפ״ז");
    expect(formatHebrewYear(5786)).toBe("תשפ״ו");
    expect(formatHebrewYear(1)).toBe("א׳");
  });
});
