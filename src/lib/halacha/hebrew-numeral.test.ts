import { describe, expect, it } from "vitest";
import { formatHebrewYear, toHebrewNumeral } from "./hebrew-numeral";

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

describe("formatHebrewYear", () => {
  it("adds gershayim before the last letter", () => {
    expect(formatHebrewYear(5787)).toBe("תשפ״ז");
    expect(formatHebrewYear(5786)).toBe("תשפ״ו");
    expect(formatHebrewYear(1)).toBe("א׳");
  });
});
