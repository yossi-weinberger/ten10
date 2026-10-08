import { describe, expect, it } from "vitest";
import {
  formatGregorianDateInput,
  parseExactGregorianDateInput,
  parseFlexibleGregorianDateInput,
} from "./gregorian-date-input";

describe("parseExactGregorianDateInput", () => {
  it("accepts a complete dd/MM/yyyy date", () => {
    const parsed = parseExactGregorianDateInput("12/09/2020");
    expect(parsed?.getFullYear()).toBe(2020);
    expect(parsed?.getMonth()).toBe(8);
    expect(parsed?.getDate()).toBe(12);
  });

  it("rejects a partial year", () => {
    expect(parseExactGregorianDateInput("12/09/20")).toBeNull();
    expect(parseExactGregorianDateInput("01/01/26")).toBeNull();
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
    expect(parseFlexibleGregorianDateInput("01/01").status).toBe("invalid");
    expect(parseFlexibleGregorianDateInput("31/02/26").status).toBe("invalid");
    expect(parseFlexibleGregorianDateInput("").status).toBe("empty");
  });
});
