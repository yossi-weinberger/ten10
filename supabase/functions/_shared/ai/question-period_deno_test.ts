import { ambiguousMaaserYear, boundsFromPeriod, readPeriodPayload } from "./question-period.ts";

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
      offset: null,
      calendar: "gregorian",
    },
  });
  const bounds = boundsFromPeriod(period, "2026-10-19");
  assert(bounds?.from === "2025-01-01" && bounds.to === "2025-12-31", "2025");
  assert(readPeriodPayload({ period: null }) === null, "no period");
  assert(boundsFromPeriod(null, "2026-10-19") === null, "null bounds");
  const recent = boundsFromPeriod({
    kind: "last_n_months",
    year: null,
    month: null,
    n: 3,
    offset: null,
    from: null,
    to: null,
    calendar: "gregorian",
  }, "2026-10-19");
  assert(recent?.from === "2026-07-20" && recent.to === "2026-10-19", "three months starts the next day");
  const old = boundsFromPeriod({
    kind: "range",
    year: null,
    month: null,
    n: null,
    offset: null,
    from: { kind: "exact", n: null, weekday: null, day: 1, month: 1, year: 2024 },
    to: { kind: "exact", n: null, weekday: null, day: 31, month: 3, year: 2025 },
    calendar: "gregorian",
  }, "2026-10-19");
  assert(old?.from === "2024-01-01" && old.to === "2025-03-31", "a range ignores the transaction window");
  const maaser = boundsFromPeriod({
    kind: "maaser_year",
    year: null,
    month: null,
    n: null,
    offset: 0,
    from: null,
    to: null,
    calendar: "hebrew",
  }, "2026-10-19");
  assert(maaser?.from === "2026-09-12" && maaser.to === "2026-10-19", "current maaser year");
  assert(ambiguousMaaserYear("כמה תרמתי בשנת המעשר 2025"), "gregorian year");
  assert(!ambiguousMaaserYear("כמה תרמתי בשנת המעשר 5786"), "hebrew year");
  assert(!ambiguousMaaserYear("כמה תרמתי השנה"), "no maaser year");
});
