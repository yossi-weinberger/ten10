import { describe, expect, it } from "vitest";
import {
  formatGregorianDateInput,
  parseCompleteFourDigitGregorianDateInput,
  parseFlexibleGregorianDateInput,
  autoFormatDigitsOnly,
  formatAsUserTypes,
} from "./gregorian-date-input";

describe("autoFormatDigitsOnly", () => {
  it("formats 8 digits as DD/MM/YYYY", () => {
    expect(autoFormatDigitsOnly("31102026")).toBe("31/10/2026");
    expect(autoFormatDigitsOnly("01012026")).toBe("01/01/2026");
  });

  it("formats 6 digits as DD/MM/YY", () => {
    expect(autoFormatDigitsOnly("311026")).toBe("31/10/26");
    expect(autoFormatDigitsOnly("010126")).toBe("01/01/26");
  });

  it("returns original value for other lengths", () => {
    expect(autoFormatDigitsOnly("1234")).toBe("1234");
    expect(autoFormatDigitsOnly("12345")).toBe("12345");
    expect(autoFormatDigitsOnly("1234567")).toBe("1234567");
    expect(autoFormatDigitsOnly("123456789")).toBe("123456789");
  });

  it("returns original value if already formatted", () => {
    expect(autoFormatDigitsOnly("31/10/2026")).toBe("31/10/2026");
  });
});

describe("formatAsUserTypes", () => {
  it("preserves manually typed values", () => {
    let result = formatAsUserTypes("", "3", 1);
    expect(result.formatted).toBe("3");
    
    result = formatAsUserTypes("3", "31", 2);
    expect(result.formatted).toBe("31");
    
    result = formatAsUserTypes("31", "31/", 3);
    expect(result.formatted).toBe("31/");
    
    result = formatAsUserTypes("31/", "31/1", 4);
    expect(result.formatted).toBe("31/1");
  });

  it("does not re-insert separators on backspace", () => {
    const result = formatAsUserTypes("31/10/2026", "31/10/202", 9);
    expect(result.formatted).toBe("31/10/202");
  });

  it("handles paste of 8 digits", () => {
    const result = formatAsUserTypes("", "31102026", 8);
    expect(result.formatted).toBe("31/10/2026");
  });

  it("handles paste of 6 digits", () => {
    const result = formatAsUserTypes("", "311026", 6);
    expect(result.formatted).toBe("31/10/26");
  });

  it("handles paste of 8 digits over existing value", () => {
    const result = formatAsUserTypes("08/10/2026", "31102026", 8);
    expect(result.formatted).toBe("31/10/2026");
  });
});

describe("parseCompleteFourDigitGregorianDateInput", () => {
  it("accepts a complete dd/MM/yyyy date with slash", () => {
    const parsed = parseCompleteFourDigitGregorianDateInput("12/09/2020");
    expect(parsed.status).toBe("parsed");
    if (parsed.status === "parsed") {
      expect(parsed.date.getFullYear()).toBe(2020);
      expect(parsed.date.getMonth()).toBe(8);
      expect(parsed.date.getDate()).toBe(12);
    }
  });

  it("accepts dates with dot separator", () => {
    const parsed = parseCompleteFourDigitGregorianDateInput("12.09.2020");
    expect(parsed.status).toBe("parsed");
    if (parsed.status === "parsed") {
      expect(parsed.date.getFullYear()).toBe(2020);
      expect(formatGregorianDateInput(parsed.date)).toBe("12/09/2020");
    }
  });

  it("accepts dates with dash separator", () => {
    const parsed = parseCompleteFourDigitGregorianDateInput("12-09-2020");
    expect(parsed.status).toBe("parsed");
    if (parsed.status === "parsed") {
      expect(parsed.date.getFullYear()).toBe(2020);
      expect(formatGregorianDateInput(parsed.date)).toBe("12/09/2020");
    }
  });

  it("accepts d/M/yyyy and dd/MM/yyyy", () => {
    const padded = parseCompleteFourDigitGregorianDateInput("15/03/2026");
    expect(padded.status).toBe("parsed");
    if (padded.status === "parsed") {
      expect(formatGregorianDateInput(padded.date)).toBe("15/03/2026");
    }

    const short = parseCompleteFourDigitGregorianDateInput("1/3/2026");
    expect(short.status).toBe("parsed");
    if (short.status === "parsed") {
      expect(formatGregorianDateInput(short.date)).toBe("01/03/2026");
    }
  });

  it("marks two-digit year as partial (not complete)", () => {
    expect(parseCompleteFourDigitGregorianDateInput("12/09/20").status).toBe("partial");
    expect(parseCompleteFourDigitGregorianDateInput("15/03/20").status).toBe("partial");
    expect(parseCompleteFourDigitGregorianDateInput("01/01/26").status).toBe("partial");
  });

  it("marks three-digit year as partial", () => {
    expect(parseCompleteFourDigitGregorianDateInput("15/03/202").status).toBe("partial");
  });

  it("marks nonexistent dates as nonexistent", () => {
    expect(parseCompleteFourDigitGregorianDateInput("31/02/2026").status).toBe("nonexistent");
    expect(parseCompleteFourDigitGregorianDateInput("32/01/2026").status).toBe("nonexistent");
    expect(parseCompleteFourDigitGregorianDateInput("29/02/2025").status).toBe("nonexistent");
  });

  it("marks dates before 2000 as out_of_range", () => {
    expect(parseCompleteFourDigitGregorianDateInput("31/12/1999").status).toBe("out_of_range");
    expect(parseCompleteFourDigitGregorianDateInput("01/01/1990").status).toBe("out_of_range");
  });

  it("marks invalid format as invalid_format", () => {
    expect(parseCompleteFourDigitGregorianDateInput("abc").status).toBe("invalid_format");
    expect(parseCompleteFourDigitGregorianDateInput("not-a-date").status).toBe("invalid_format");
  });
});

describe("parseFlexibleGregorianDateInput", () => {
  it("normalizes dd/MM/yy to 20yy with slash", () => {
    const result = parseFlexibleGregorianDateInput("01/01/26");
    expect(result.status).toBe("parsed");
    if (result.status === "parsed") {
      expect(result.date.getFullYear()).toBe(2026);
      expect(result.date.getMonth()).toBe(0);
      expect(result.date.getDate()).toBe(1);
      expect(formatGregorianDateInput(result.date)).toBe("01/01/2026");
    }
  });

  it("normalizes dd.MM.yy to 20yy with dot", () => {
    const result = parseFlexibleGregorianDateInput("01.01.26");
    expect(result.status).toBe("parsed");
    if (result.status === "parsed") {
      expect(result.date.getFullYear()).toBe(2026);
      expect(formatGregorianDateInput(result.date)).toBe("01/01/2026");
    }
  });

  it("normalizes dd-MM-yy to 20yy with dash", () => {
    const result = parseFlexibleGregorianDateInput("01-01-26");
    expect(result.status).toBe("parsed");
    if (result.status === "parsed") {
      expect(result.date.getFullYear()).toBe(2026);
      expect(formatGregorianDateInput(result.date)).toBe("01/01/2026");
    }
  });

  it("accepts d/M/yy", () => {
    const result = parseFlexibleGregorianDateInput("1/1/26");
    expect(result.status).toBe("parsed");
    if (result.status === "parsed") {
      expect(result.date.getFullYear()).toBe(2026);
      expect(formatGregorianDateInput(result.date)).toBe("01/01/2026");
    }
  });

  it("maps 01/01/99 to 2099, not 1999", () => {
    const result = parseFlexibleGregorianDateInput("01/01/99");
    expect(result.status).toBe("parsed");
    if (result.status === "parsed") {
      expect(result.date.getFullYear()).toBe(2099);
    }
  });

  it("rejects nonexistent dates", () => {
    expect(parseFlexibleGregorianDateInput("31/02/26").status).toBe("nonexistent");
    expect(parseFlexibleGregorianDateInput("32/01/2026").status).toBe("nonexistent");
  });

  it("rejects dates before 2000 as out_of_range", () => {
    expect(parseFlexibleGregorianDateInput("31/12/1999").status).toBe("out_of_range");
    expect(parseFlexibleGregorianDateInput("01/01/0999").status).toBe("out_of_range");
  });

  it("marks partial input as partial", () => {
    expect(parseFlexibleGregorianDateInput("01/01").status).toBe("partial");
    expect(parseFlexibleGregorianDateInput("1").status).toBe("partial");
    expect(parseFlexibleGregorianDateInput("12/").status).toBe("partial");
  });

  it("marks invalid format as invalid_format", () => {
    expect(parseFlexibleGregorianDateInput("not-a-date").status).toBe("invalid_format");
    expect(parseFlexibleGregorianDateInput("abc").status).toBe("invalid_format");
  });

  it("returns empty for empty string", () => {
    expect(parseFlexibleGregorianDateInput("").status).toBe("empty");
    expect(parseFlexibleGregorianDateInput("   ").status).toBe("empty");
  });
});
