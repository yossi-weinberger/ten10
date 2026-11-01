import { describe, expect, it } from "vitest";
import {
  formatGregorianDateInput,
  parseCompleteFourDigitGregorianDateInput,
  parseFlexibleGregorianDateInput,
  autoFormatDigitsOnly,
  formatAsUserTypes,
  formatIosDigitSequence,
} from "./gregorian-date-input";

function typeKeys(keys: string, start = ""): {
  value: string;
  caret: number;
  steps: Array<{ key: string; formatted: string; caretPos: number }>;
} {
  let value = start;
  let caret = start.length;
  const steps: Array<{ key: string; formatted: string; caretPos: number }> = [];
  for (const key of keys) {
    const newValue = value.slice(0, caret) + key + value.slice(caret);
    const result = formatAsUserTypes(value, newValue, caret + key.length);
    value = result.formatted;
    caret = result.caretPos;
    steps.push({ key, formatted: value, caretPos: caret });
  }
  return { value, caret, steps };
}

function expectTypedSequence(
  keys: string,
  expected: Array<{ formatted: string; caretPos: number }>,
) {
  const { steps, value } = typeKeys(keys);
  expect(steps).toHaveLength(expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    expect(steps[index], `after '${keys[index]}'`).toEqual({
      key: keys[index],
      formatted: expected[index]!.formatted,
      caretPos: expected[index]!.caretPos,
    });
  }
  return value;
}

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
  it("auto-inserts slash after 2nd day digit", () => {
    const result = formatAsUserTypes("3", "31", 2);
    expect(result.formatted).toBe("31/");
    expect(result.caretPos).toBe(3);
  });

  it("does not insert a slash eagerly after month 1 + 0", () => {
    const result = formatAsUserTypes("31/1", "31/10", 5);
    expect(result.formatted).toBe("31/10");
    expect(result.caretPos).toBe(5);
  });

  it("types 15/03/2026 char by char with slashes, caret after each key", () => {
    const value = expectTypedSequence("15/03/2026", [
      { formatted: "1", caretPos: 1 },
      { formatted: "15/", caretPos: 3 },
      { formatted: "15/", caretPos: 3 },
      { formatted: "15/0", caretPos: 4 },
      { formatted: "15/03/", caretPos: 6 },
      { formatted: "15/03/", caretPos: 6 },
      { formatted: "15/03/2", caretPos: 7 },
      { formatted: "15/03/20", caretPos: 8 },
      { formatted: "15/03/202", caretPos: 9 },
      { formatted: "15/03/2026", caretPos: 10 },
    ]);
    const committed = parseFlexibleGregorianDateInput(value);
    expect(committed.status).toBe("parsed");
    if (committed.status === "parsed") {
      expect(formatGregorianDateInput(committed.date)).toBe("15/03/2026");
    }
  });

  it("types 01/03/2026 char by char with slashes, caret after each key", () => {
    const value = expectTypedSequence("01/03/2026", [
      { formatted: "0", caretPos: 1 },
      { formatted: "01/", caretPos: 3 },
      { formatted: "01/", caretPos: 3 },
      { formatted: "01/0", caretPos: 4 },
      { formatted: "01/03/", caretPos: 6 },
      { formatted: "01/03/", caretPos: 6 },
      { formatted: "01/03/2", caretPos: 7 },
      { formatted: "01/03/20", caretPos: 8 },
      { formatted: "01/03/202", caretPos: 9 },
      { formatted: "01/03/2026", caretPos: 10 },
    ]);
    const committed = parseFlexibleGregorianDateInput(value);
    expect(committed.status).toBe("parsed");
    if (committed.status === "parsed") {
      expect(formatGregorianDateInput(committed.date)).toBe("01/03/2026");
    }
  });

  it("types 15/03/26 char by char with slashes, caret after each key", () => {
    const value = expectTypedSequence("15/03/26", [
      { formatted: "1", caretPos: 1 },
      { formatted: "15/", caretPos: 3 },
      { formatted: "15/", caretPos: 3 },
      { formatted: "15/0", caretPos: 4 },
      { formatted: "15/03/", caretPos: 6 },
      { formatted: "15/03/", caretPos: 6 },
      { formatted: "15/03/2", caretPos: 7 },
      { formatted: "15/03/26", caretPos: 8 },
    ]);
    expect(parseCompleteFourDigitGregorianDateInput(value).status).toBe("partial");
    const committed = parseFlexibleGregorianDateInput(value);
    expect(committed.status).toBe("parsed");
    if (committed.status === "parsed") {
      expect(formatGregorianDateInput(committed.date)).toBe("15/03/2026");
    }
  });

  it("types 31.10.2026 char by char, normalizing dots and swallowing extras", () => {
    const value = expectTypedSequence("31.10.2026", [
      { formatted: "3", caretPos: 1 },
      { formatted: "31/", caretPos: 3 },
      { formatted: "31/", caretPos: 3 },
      { formatted: "31/1", caretPos: 4 },
      { formatted: "31/10", caretPos: 5 },
      { formatted: "31/10/", caretPos: 6 },
      { formatted: "31/10/2", caretPos: 7 },
      { formatted: "31/10/20", caretPos: 8 },
      { formatted: "31/10/202", caretPos: 9 },
      { formatted: "31/10/2026", caretPos: 10 },
    ]);
    const committed = parseFlexibleGregorianDateInput(value);
    expect(committed.status).toBe("parsed");
    if (committed.status === "parsed") {
      expect(formatGregorianDateInput(committed.date)).toBe("31/10/2026");
    }
  });

  it("types 31-10-2026 char by char, normalizing dashes and swallowing extras", () => {
    const value = expectTypedSequence("31-10-2026", [
      { formatted: "3", caretPos: 1 },
      { formatted: "31/", caretPos: 3 },
      { formatted: "31/", caretPos: 3 },
      { formatted: "31/1", caretPos: 4 },
      { formatted: "31/10", caretPos: 5 },
      { formatted: "31/10/", caretPos: 6 },
      { formatted: "31/10/2", caretPos: 7 },
      { formatted: "31/10/20", caretPos: 8 },
      { formatted: "31/10/202", caretPos: 9 },
      { formatted: "31/10/2026", caretPos: 10 },
    ]);
    const committed = parseFlexibleGregorianDateInput(value);
    expect(committed.status).toBe("parsed");
    if (committed.status === "parsed") {
      expect(formatGregorianDateInput(committed.date)).toBe("31/10/2026");
    }
  });

  it("does not re-insert separators when slashes are deleted down to 8 digits", () => {
    const afterFirstSlash = formatAsUserTypes("31/10/2026", "3110/2026", 2);
    expect(afterFirstSlash.formatted).toBe("3110/2026");
    const afterBoth = formatAsUserTypes("3110/2026", "31102026", 4);
    expect(afterBoth.formatted).toBe("31102026");
    expect(afterBoth.formatted).not.toBe("31/10/2026");
  });

  it("formats iOS keypad digit sequences", () => {
    expect(formatIosDigitSequence("5112026")).toBe("05/11/2026");
    expect(formatIosDigitSequence("512026", true)).toBe("05/01/2026");
    expect(formatIosDigitSequence("5122026")).toBe("05/12/2026");
    expect(formatIosDigitSequence("05122026")).toBe("05/12/2026");
    expect(formatIosDigitSequence("31102026")).toBe("31/10/2026");
    expect(formatIosDigitSequence("3132026")).toBe("31/03/2026");
    expect(formatIosDigitSequence("152026")).toBe("15/02/2026");
  });

  it("types iOS keypad digits one at a time", () => {
    expect(typeKeys("5112026").value).toBe("05/11/2026");
    expect(typeKeys("512026").value).toBe("05/12026");
    const resolved512026 = parseFlexibleGregorianDateInput(typeKeys("512026").value);
    expect(resolved512026.status).toBe("parsed");
    if (resolved512026.status === "parsed") {
      expect(formatGregorianDateInput(resolved512026.date)).toBe("05/01/2026");
    }
    expect(typeKeys("5122026").value).toBe("05/12/2026");
    expect(typeKeys("05122026").value).toBe("05/12/2026");
    expect(typeKeys("31102026").value).toBe("31/10/2026");
    expect(typeKeys("3132026").value).toBe("31/03/2026");
    expect(typeKeys("152026").value).toBe("15/02/2026");
    expect(typeKeys("5/11/2026").value).toBe("05/11/2026");
  });

  it("preserves non-digit invalid input", () => {
    expect(typeKeys("abc").value).toBe("abc");
  });

  it("does not re-insert a pad after backspace through 0X/", () => {
    const afterFive = typeKeys("5");
    expect(afterFive.value).toBe("05/");
    const afterSlash = formatAsUserTypes("05/", "05", 2);
    expect(afterSlash.formatted).toBe("05");
    const afterFiveDigit = formatAsUserTypes("05", "0", 1);
    expect(afterFiveDigit.formatted).toBe("0");
  });

  it("accepts manually typed separator (allows d/M)", () => {
    const result = formatAsUserTypes("3", "3/", 2);
    expect(result.formatted).toBe("3/");
    expect(result.caretPos).toBe(2);
  });

  it("maps dot to slash", () => {
    const result = formatAsUserTypes("31", "31.", 3);
    expect(result.formatted).toBe("31/");
    expect(result.caretPos).toBe(3);
  });

  it("maps dash to slash", () => {
    const result = formatAsUserTypes("31", "31-", 3);
    expect(result.formatted).toBe("31/");
    expect(result.caretPos).toBe(3);
  });

  it("does not re-insert separators on backspace", () => {
    const result = formatAsUserTypes("31/10/2026", "31/10/202", 9);
    expect(result.formatted).toBe("31/10/202");
    expect(result.caretPos).toBe(9);
  });

  it("preserves mid-text edits", () => {
    const result = formatAsUserTypes("31/10/2026", "32/10/2026", 2);
    expect(result.formatted).toBe("32/10/2026");
    expect(result.caretPos).toBe(2);
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

  it("marks dates before 2000 as out_of_range with the parsed Date", () => {
    const parsed = parseCompleteFourDigitGregorianDateInput("31/12/1999");
    expect(parsed.status).toBe("out_of_range");
    if (parsed.status === "out_of_range") {
      expect(parsed.date.getFullYear()).toBe(1999);
      expect(parsed.date.getMonth()).toBe(11);
      expect(parsed.date.getDate()).toBe(31);
    }
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

  it("rejects dates before 2000 as out_of_range with the parsed Date", () => {
    const parsed = parseFlexibleGregorianDateInput("31/12/1999");
    expect(parsed.status).toBe("out_of_range");
    if (parsed.status === "out_of_range") {
      expect(parsed.date.getFullYear()).toBe(1999);
      expect(parsed.date.getMonth()).toBe(11);
      expect(parsed.date.getDate()).toBe(31);
    }
    const ancient = parseFlexibleGregorianDateInput("01/01/0999");
    expect(ancient.status).toBe("out_of_range");
    if (ancient.status === "out_of_range") {
      expect(ancient.date.getFullYear()).toBe(999);
    }
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

  it("resolves iOS keypad digit strings on commit", () => {
    const cases = [
      ["5112026", "05/11/2026"],
      ["512026", "05/01/2026"],
      ["5122026", "05/12/2026"],
      ["05122026", "05/12/2026"],
      ["31102026", "31/10/2026"],
      ["3132026", "31/03/2026"],
      ["152026", "15/02/2026"],
      ["05/12026", "05/01/2026"],
    ] as const;

    for (const [input, display] of cases) {
      const result = parseFlexibleGregorianDateInput(input);
      expect(result.status, input).toBe("parsed");
      if (result.status === "parsed") {
        expect(formatGregorianDateInput(result.date), input).toBe(display);
      }
    }
  });
});
