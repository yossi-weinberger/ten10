import { periodBounds } from "./split-period.ts";
import { resolveRecurrence } from "./split-recurrence.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a gregorian year and a last-n range are inclusive dates", () => {
  const year = periodBounds({
    kind: "year",
    year: 2026,
    month: null,
    n: null,
    from: null,
    to: null,
    calendar: "gregorian",
  }, "2026-10-30");
  assert(year?.from === "2026-01-01" && year.to === "2026-12-31", "year");
  const recent = periodBounds({
    kind: "last_n_months",
    year: null,
    month: null,
    n: 1,
    from: null,
    to: null,
    calendar: "gregorian",
  }, "2026-10-30");
  assert(recent?.to === "2026-10-30" && recent.from === "2026-09-30", "one month back");
});

Deno.test("a monthly standing order starts next month and counts to the end of the year", () => {
  const resolved = resolveRecurrence({
    frequency: "monthly",
    calendar: "gregorian",
    day_of_month: 1,
    weekday: null,
    start_kind: "next_month",
    start: null,
    end_kind: "end_of_year",
    end_count: null,
    end: null,
    already_charged: false,
  }, "2026-10-30");
  assert(resolved.startDate === "2026-11-01", "next month");
  assert(resolved.frequency === "monthly", "monthly");
  assert(resolved.totalOccurrences === 2, "November and December");
});
