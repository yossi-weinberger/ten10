import { describe, expect, it } from "vitest";
import { parseDate } from "./normalize";

describe("parseDate Israeli day-first formats", () => {
  it("parses dd/mm/yy without US month-first swap", () => {
    expect(parseDate("02/11/26")).toBe("2026-11-02");
    expect(parseDate("14/11/26")).toBe("2026-11-14");
    expect(parseDate("05/11/26")).toBe("2026-11-05");
  });

  it("parses dd/mm/yyyy and dd-mm-yyyy", () => {
    expect(parseDate("02/11/2026")).toBe("2026-11-02");
    expect(parseDate("03-11-2026")).toBe("2026-11-03");
    expect(parseDate("10-12-2026")).toBe("2026-12-10");
  });

  it("parses dd-mm-yy and dd.mm.yy", () => {
    expect(parseDate("03-11-26")).toBe("2026-11-03");
    expect(parseDate("03.11.26")).toBe("2026-11-03");
    expect(parseDate("10.11.2026")).toBe("2026-11-10");
  });

  it("rejects impossible calendar dates instead of overflowing", () => {
    expect(parseDate("31/02/26")).toBeNull();
    expect(parseDate("32/11/2026")).toBeNull();
  });

  it("does not use native Date for ambiguous numeric dates", () => {
    // Native US parsing would read this as 11 Feb; day-first must win.
    expect(parseDate("02/11/26")).toBe("2026-11-02");
    // Invalid day-first numeric form must not fall back to native parsing.
    expect(parseDate("99/99/99")).toBeNull();
  });
});
