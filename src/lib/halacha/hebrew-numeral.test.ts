import { describe, expect, it } from "vitest";
import { toHebrewNumeral } from "./hebrew-numeral";

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
