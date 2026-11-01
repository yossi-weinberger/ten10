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
  assert(recent?.to === "2026-10-30" && recent.from === "2026-10-01", "one month back");
});

Deno.test("a month offset, a month without a year, and a relative range become dates", () => {
  const today = "2026-11-01";
  const lastMonth = periodBounds({
    kind: "month",
    year: null,
    month: null,
    n: null,
    offset: -1,
    from: null,
    to: null,
    calendar: "gregorian",
  }, today);
  assert(lastMonth?.from === "2026-10-01" && lastMonth.to === "2026-10-31", "offset is the current month plus the offset");
  const october = periodBounds({
    kind: "month",
    year: null,
    month: 10,
    n: null,
    offset: null,
    from: null,
    to: null,
    calendar: "gregorian",
  }, today);
  assert(october?.from === "2026-10-01" && october.to === "2026-10-31", "a past month number keeps this year");
  const december = periodBounds({
    kind: "month",
    year: null,
    month: 12,
    n: null,
    offset: null,
    from: null,
    to: null,
    calendar: "gregorian",
  }, today);
  assert(december?.from === "2025-12-01" && december.to === "2025-12-31", "a future month number uses last year");
  const lastWeek = periodBounds({
    kind: "range",
    year: null,
    month: null,
    n: null,
    offset: null,
    from: { kind: "days_ago", n: 7, weekday: null, day: null, month: null, year: null },
    to: { kind: "days_ago", n: 1, weekday: null, day: null, month: null, year: null },
    calendar: "gregorian",
  }, today);
  assert(lastWeek?.from === "2026-10-25" && lastWeek.to === "2026-10-31", "days ago");
  const weekday = periodBounds({
    kind: "range",
    year: null,
    month: null,
    n: null,
    offset: null,
    from: { kind: "last_weekday", n: null, weekday: 0, day: null, month: null, year: null },
    to: { kind: "days_ago", n: 0, weekday: null, day: null, month: null, year: null },
    calendar: "gregorian",
  }, today);
  assert(weekday?.from === "2026-10-25" && weekday.to === "2026-11-01", "last weekday");
  const day = periodBounds({
    kind: "range",
    year: null,
    month: null,
    n: null,
    offset: null,
    from: { kind: "day_of_month", n: null, weekday: null, day: 20, month: null, year: null },
    to: { kind: "days_ago", n: 0, weekday: null, day: null, month: null, year: null },
    calendar: "gregorian",
  }, today);
  assert(day?.from === "2026-10-20" && day.to === "2026-11-01", "day of month");
  const bareYear = periodBounds({
    kind: "year",
    year: null,
    month: null,
    n: null,
    offset: null,
    from: null,
    to: null,
    calendar: "gregorian",
  }, today);
  assert(bareYear === null, "a year without a number stays unanswered");
  const emptyRange = periodBounds({
    kind: "range",
    year: null,
    month: null,
    n: null,
    offset: null,
    from: { kind: "exact", n: null, weekday: null, day: null, month: null, year: null },
    to: null,
    calendar: "gregorian",
  }, today);
  assert(emptyRange === null, "an empty range stays unanswered");
  const savedSpan = periodBounds({
    kind: "range",
    year: null,
    month: null,
    n: null,
    offset: null,
    from: { kind: "exact", n: null, weekday: null, day: 1, month: 1, year: 2024 },
    to: { kind: "exact", n: null, weekday: null, day: 31, month: 3, year: 2025 },
    calendar: "gregorian",
  }, today);
  assert(savedSpan?.from === "2024-01-01" && savedSpan.to === "2025-03-31", "a full exact range stays");
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
