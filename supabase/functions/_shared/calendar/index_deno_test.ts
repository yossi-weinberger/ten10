import {
  CALENDAR_PARITY_EXPECTED,
  CALENDAR_PARITY_FIXTURES,
  evaluateCalendarFixtures,
} from "./parity-fixtures.ts";
import { getCalendarAdapter } from "./index.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

Deno.test("shared calendar fixtures match app parity output", () => {
  assertEquals(
    evaluateCalendarFixtures(CALENDAR_PARITY_FIXTURES),
    CALENDAR_PARITY_EXPECTED,
  );
});

Deno.test("shared Hebrew calendar truth round-trips in Deno", () => {
  const adapter = getCalendarAdapter("hebrew");
  const representation = adapter.fromIsoDate("2026-09-12");

  assertEquals(
    {
      year: representation.year,
      month: representation.month,
      day: representation.day,
      isoDate: adapter.toIsoDate(representation),
    },
    {
      year: 5787,
      month: 1,
      day: 1,
      isoDate: "2026-09-12",
    },
  );
});
