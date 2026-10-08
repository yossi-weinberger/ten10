import { describe, expect, it } from "vitest";
import {
  formatGregorianDateInput,
  parseCompleteFourDigitGregorianDateInput,
  parseFlexibleGregorianDateInput,
} from "./gregorian-date-input";

describe("parseCompleteFourDigitGregorianDateInput", () => {
  it("accepts a complete dd/MM/yyyy date", () => {
    const parsed = parseCompleteFourDigitGregorianDateInput("12/09/2020");
    expect(parsed.status).toBe("parsed");
    if (parsed.status === "parsed") {
      expect(parsed.date.getFullYear()).toBe(2020);
      expect(parsed.date.getMonth()).toBe(8);
      expect(parsed.date.getDate()).toBe(12);
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

  it("does not treat a two-digit year as complete", () => {
    expect(parseCompleteFourDigitGregorianDateInput("12/09/20").status).toBe(
      "invalid",
    );
    expect(parseCompleteFourDigitGregorianDateInput("15/03/20").status).toBe(
      "invalid",
    );
    expect(parseCompleteFourDigitGregorianDateInput("01/01/26").status).toBe(
      "invalid",
    );
    expect(parseCompleteFourDigitGregorianDateInput("15/03/202").status).toBe(
      "invalid",
    );
  });
});

describe("parseFlexibleGregorianDateInput", () => {
  it("normalizes dd/MM/yy to 20yy", () => {
    const result = parseFlexibleGregorianDateInput("01/01/26");
    expect(result.status).toBe("parsed");
    if (result.status === "parsed") {
      expect(result.date.getFullYear()).toBe(2026);
      expect(result.date.getMonth()).toBe(0);
      expect(result.date.getDate()).toBe(1);
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

  it("rejects garbage and incomplete values", () => {
    expect(parseFlexibleGregorianDateInput("not-a-date").status).toBe("invalid");
    expect(parseFlexibleGregorianDateInput("abc").status).toBe("invalid");
    expect(parseFlexibleGregorianDateInput("01/01").status).toBe("invalid");
    expect(parseFlexibleGregorianDateInput("31/02/26").status).toBe("invalid");
    expect(parseFlexibleGregorianDateInput("").status).toBe("empty");
  });
});
