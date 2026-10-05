import { describe, expect, it } from "vitest";
import {
  RECURRENCE_PARITY_COMBINATION_COUNT,
  RECURRENCE_PARITY_EXPECTED,
  RECURRENCE_PARITY_FIXTURES,
  evaluateRecurrenceFixtures,
} from "../../../supabase/functions/_shared/calendar/recurrence-parity-fixtures";

describe("recurrence runtime parity", () => {
  it("runs at least 50 combinations against exact shared JSON", () => {
    const evaluated = evaluateRecurrenceFixtures(RECURRENCE_PARITY_FIXTURES);
    const combinationCount = evaluated.reduce(
      (count, result) => count + (Array.isArray(result) ? result.length : 1),
      0,
    );
    expect(combinationCount).toBe(RECURRENCE_PARITY_COMBINATION_COUNT);
    expect(RECURRENCE_PARITY_COMBINATION_COUNT).toBeGreaterThanOrEqual(50);
    expect(evaluated).toEqual(RECURRENCE_PARITY_EXPECTED);
  });
});
