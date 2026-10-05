import { describe, expect, it } from "vitest";
import {
  formatLocalDate,
  getCurrentLocalDate,
  parseLocalDate,
} from "./local-date";

describe("local date-only values", () => {
  it("keeps the local day shortly after midnight", () => {
    const date = new Date(2026, 8, 23, 0, 30);

    expect(getCurrentLocalDate(date)).toBe("2026-09-23");
  });

  it("keeps the local day shortly before midnight", () => {
    const date = new Date(2026, 8, 23, 23, 30);

    expect(getCurrentLocalDate(date)).toBe("2026-09-23");
  });

  it("round-trips date-only strings through local calendar fields", () => {
    const date = parseLocalDate("2026-09-23");

    expect(formatLocalDate(date)).toBe("2026-09-23");
    expect(date.getHours()).toBe(0);
  });
});
