import { describe, expect, it } from "vitest";
import { advanceMonthly, firstDueDate } from "./recurring-date.utils";

describe("firstDueDate", () => {
  it("uses next month when billing day already passed in start month", () => {
    expect(firstDueDate("2026-01-31", 15)).toBe("2026-02-15");
  });

  it("uses start day when billing day matches start", () => {
    expect(firstDueDate("2026-01-31", 31)).toBe("2026-01-31");
  });

  it("uses same month when billing day is after start", () => {
    expect(firstDueDate("2026-01-10", 15)).toBe("2026-01-15");
  });

  it("moves billing day within the same month when editing next due", () => {
    expect(firstDueDate("2026-02-15", 20)).toBe("2026-02-20");
  });
});

describe("advanceMonthly", () => {
  it("does not skip February after Jan 31 with dom 15", () => {
    expect(advanceMonthly("2026-01-31", 15)).toBe("2026-02-15");
  });

  it("clamps dom 31 to last day of February", () => {
    expect(advanceMonthly("2026-01-31", 31)).toBe("2026-02-28");
    expect(advanceMonthly("2026-02-28", 31)).toBe("2026-03-31");
  });
});
