import { readUsageDecision } from "./usage-gate.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("an allowed answer carries the usage id", () => {
  const decision = readUsageDecision({ allowed: true, usage_id: "u-1", units_left: 9, resets_at: "2026-11-01T00:00:00+00:00" }, null);
  assert(decision.allowed && decision.usageId === "u-1", "allowed");
});

Deno.test("a call check is allowed without a usage id", () => {
  const decision = readUsageDecision({ allowed: true, reason: null }, null);
  assert(decision.allowed && decision.usageId === null, "allowed");
});

Deno.test("each block reason is kept with its reset time", () => {
  for (const reason of ["quota_exhausted", "rate_limited", "daily_limit"]) {
    const decision = readUsageDecision({ allowed: false, reason, resets_at: "2026-11-01T00:00:00+00:00" }, null);
    assert(!decision.allowed && decision.reason === reason, reason);
    assert(!decision.allowed && decision.resetsAt === "2026-11-01T00:00:00+00:00", `${reason} reset`);
  }
});

Deno.test("an error or an unreadable answer blocks the call", () => {
  for (const [data, error] of [
    [null, { message: "boom" }],
    [null, null],
    ["yes", null],
    [[], null],
    [{ allowed: "true" }, null],
    [{ allowed: false, reason: "something_new" }, null],
  ] as const) {
    const decision = readUsageDecision(data, error);
    assert(!decision.allowed && decision.reason === "unavailable", JSON.stringify(data));
  }
});
