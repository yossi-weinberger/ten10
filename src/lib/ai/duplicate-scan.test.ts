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
});
