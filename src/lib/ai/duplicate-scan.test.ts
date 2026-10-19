import { describe, expect, it } from "vitest";
import { findDuplicatePairs, type SavedTransactionRow } from "./duplicate-scan";

function row(patch: Partial<SavedTransactionRow>): SavedTransactionRow {
  return {
    id: "a",
    date: "2026-10-19",
    amount: 100,
    currency: "ILS",
    type: "expense",
    description: "מאפים",
    ...patch,
  };
}

describe("findDuplicatePairs", () => {
  it("pairs the same type and currency inside three days and two percent", () => {
    const pairs = findDuplicatePairs([
      row({ id: "a", date: "2026-10-19", amount: 100 }),
      row({ id: "b", date: "2026-10-21", amount: 101, description: "מאפה" }),
      row({ id: "c", date: "2026-10-19", amount: 100, type: "donation" }),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.left.id).toBe("a");
    expect(pairs[0]?.right.id).toBe("b");
  });

  it("skips a later date and a different currency", () => {
    const pairs = findDuplicatePairs([
      row({ id: "a", date: "2026-10-01", amount: 100 }),
      row({ id: "b", date: "2026-10-10", amount: 100 }),
      row({ id: "c", date: "2026-10-01", amount: 100, currency: "USD" }),
    ]);
    expect(pairs).toHaveLength(0);
  });

  it("lists the newest pair first", () => {
    const pairs = findDuplicatePairs([
      row({ id: "old-a", date: "2026-01-01", amount: 100 }),
      row({ id: "old-b", date: "2026-01-02", amount: 100 }),
      row({ id: "new-a", date: "2026-10-18", amount: 50 }),
      row({ id: "new-b", date: "2026-10-19", amount: 50 }),
    ]);
    expect(pairs.map((pair) => pair.left.id)).toEqual(["new-a", "old-a"]);
  });
});
