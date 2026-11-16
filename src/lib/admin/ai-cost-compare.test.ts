import { describe, expect, it } from "vitest";
import { compareDailyCost } from "./ai-cost-compare";

describe("compareDailyCost", () => {
  it("pairs gateway app spend with recorded cost per day", () => {
    const rows = compareDailyCost(
      [
        { day: "2026-10-28", totalCost: 0.0075 },
        { day: "2026-10-29", totalCost: 0.002 },
      ],
      [{ day: "2026-10-28", cost_usd: 0.0073625 }],
      "2026-10-28",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].day).toBe("2026-10-28");
    expect(rows[0].diff).toBeCloseTo(0.0001375, 10);
    expect(rows[1]).toEqual({ day: "2026-10-29", gateway: 0.002, recorded: 0, diff: 0.002 });
  });

  it("leaves out days before the first recorded call", () => {
    const rows = compareDailyCost(
      [
        { day: "2026-10-27", totalCost: 1 },
        { day: "2026-10-28", totalCost: 0.5 },
      ],
      [{ day: "2026-10-28", cost_usd: 0.5 }],
      "2026-10-28",
    );
    expect(rows.map((row) => row.day)).toEqual(["2026-10-28"]);
    expect(rows[0].diff).toBe(0);
  });

  it("shows a recorded day the gateway has not reported yet", () => {
    const rows = compareDailyCost([], [{ day: "2026-10-29", cost_usd: 0.01 }], "2026-10-28");
    expect(rows).toEqual([{ day: "2026-10-29", gateway: 0, recorded: 0.01, diff: -0.01 }]);
  });

  it("is empty when nothing was recorded", () => {
    expect(compareDailyCost([{ day: "2026-10-28", totalCost: 1 }], [], null)).toEqual([]);
  });
});
