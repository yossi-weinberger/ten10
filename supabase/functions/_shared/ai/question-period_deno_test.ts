import { boundsFromPeriod, readPeriodPayload } from "./question-period.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a year period becomes the calendar bounds", () => {
  const period = readPeriodPayload({
    period: {
      kind: "year",
      year: 2025,
      month: null,
      n: null,
      from: null,
      to: null,
      calendar: "gregorian",
    },
  });
  const bounds = boundsFromPeriod(period, "2026-10-19");
  assert(bounds?.from === "2025-01-01" && bounds.to === "2025-12-31", "2025");
  assert(readPeriodPayload({ period: null }) === null, "no period");
  assert(boundsFromPeriod(null, "2026-10-19") === null, "null bounds");
});
