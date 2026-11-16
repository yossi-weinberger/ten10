import { describe, expect, it } from "vitest";
import { groupWithSeparators } from "./group-with-separators";

describe("groupWithSeparators", () => {
  const items = [
    { id: "a", month: "2026-11" },
    { id: "b", month: "2026-11" },
    { id: "c", month: "2026-10" },
    { id: "d", month: "2026-11" },
  ];
  const keyOf = (item: { month: string }) => item.month;

  it("returns items only when grouping is disabled", () => {
    expect(groupWithSeparators(items, keyOf, false)).toEqual([
      { type: "item", item: items[0] },
      { type: "item", item: items[1] },
      { type: "item", item: items[2] },
      { type: "item", item: items[3] },
    ]);
  });

  it("inserts a separator before the first run and each key change", () => {
    expect(groupWithSeparators(items, keyOf, true)).toEqual([
      { type: "separator", key: "2026-11" },
      { type: "item", item: items[0] },
      { type: "item", item: items[1] },
      { type: "separator", key: "2026-10" },
      { type: "item", item: items[2] },
      { type: "separator", key: "2026-11" },
      { type: "item", item: items[3] },
    ]);
  });

  it("returns an empty list when there are no items", () => {
    expect(groupWithSeparators([], keyOf, true)).toEqual([]);
    expect(groupWithSeparators([], keyOf, false)).toEqual([]);
  });

  it("keeps a single leading separator when every item shares a key", () => {
    const sameMonth = [items[0], items[1]];
    expect(groupWithSeparators(sameMonth, keyOf, true)).toEqual([
      { type: "separator", key: "2026-11" },
      { type: "item", item: items[0] },
      { type: "item", item: items[1] },
    ]);
  });
});
