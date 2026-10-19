import { describe, expect, it } from "vitest";
import { orderCandidatesByRank } from "./duplicate-rank";

describe("orderCandidatesByRank", () => {
  it("puts the higher probability first and leaves unscored rows last", () => {
    const ordered = orderCandidatesByRank(
      [
        { id: "a", label: "first" },
        { id: "b", label: "second" },
        { id: "c", label: "third" },
      ],
      [
        { id: "b", probability: 0.2 },
        { id: "a", probability: 0.9 },
      ],
    );

    expect(ordered.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });
});
