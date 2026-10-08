import { describe, expect, it } from "vitest";
import { parseExactGregorianDateInput } from "./gregorian-date-input";

describe("parseExactGregorianDateInput", () => {
  it("accepts a complete dd/MM/yyyy date", () => {
    const parsed = parseExactGregorianDateInput("12/09/2020");
    expect(parsed?.getFullYear()).toBe(2020);
    expect(parsed?.getMonth()).toBe(8);
    expect(parsed?.getDate()).toBe(12);
  });

  it("rejects a two-digit year so blur/commit must normalize it", () => {
    expect(parseExactGregorianDateInput("12/09/20")).toBeNull();
    expect(parseExactGregorianDateInput("01/01/26")).toBeNull();
  });
});
