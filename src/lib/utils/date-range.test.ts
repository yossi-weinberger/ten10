import { describe, expect, it } from "vitest";
import { getPreviousPeriodRange } from "./date-range";

describe("getPreviousPeriodRange", () => {
  const cases = [
    {
      name: "keeps an inclusive 29-day leap-February range equally long",
      startDate: "2024-02-01",
      endDate: "2024-02-29",
      expectedStart: "2024-01-03",
      expectedEnd: "2024-01-31",
    },
    {
      name: "crosses a month boundary without calendar-month alignment",
      startDate: "2026-05-10",
      endDate: "2026-06-09",
      expectedStart: "2026-04-09",
      expectedEnd: "2026-05-09",
    },
    {
      name: "crosses a year boundary with the same inclusive length",
      startDate: "2024-01-01",
      endDate: "2024-01-31",
      expectedStart: "2023-12-01",
      expectedEnd: "2023-12-31",
    },
    {
      name: "places the leap day in the previous range when arithmetic reaches it",
      startDate: "2024-03-01",
      endDate: "2024-03-02",
      expectedStart: "2024-02-28",
      expectedEnd: "2024-02-29",
    },
    {
      name: "moves a single-day range to the immediately preceding day",
      startDate: "2024-06-15",
      endDate: "2024-06-15",
      expectedStart: "2024-06-14",
      expectedEnd: "2024-06-14",
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      expect(
        getPreviousPeriodRange(testCase.startDate, testCase.endDate),
      ).toEqual({
        startDate: testCase.expectedStart,
        endDate: testCase.expectedEnd,
      });
    });
  }

  it("treats date-only inputs as UTC dates rather than shifting them to local midnight", () => {
    expect(getPreviousPeriodRange("2026-01-01", "2026-01-01")).toEqual({
      startDate: "2025-12-31",
      endDate: "2025-12-31",
    });
  });
});
