import { describe, expect, it } from "vitest";
import { serializeTransactionDateRange } from "./transactions-filter-date.utils";

describe("serializeTransactionDateRange", () => {
  it("serializes local range boundaries shortly after midnight", () => {
    expect(
      serializeTransactionDateRange({
        from: new Date(2026, 8, 23, 0, 30),
        to: new Date(2026, 8, 24, 0, 30),
      }),
    ).toEqual({
      from: "2026-09-23",
      to: "2026-09-24",
    });
  });

  it("serializes local range boundaries shortly before midnight", () => {
    expect(
      serializeTransactionDateRange({
        from: new Date(2026, 8, 23, 23, 30),
        to: new Date(2026, 8, 24, 23, 30),
      }),
    ).toEqual({
      from: "2026-09-23",
      to: "2026-09-24",
    });
  });
});
