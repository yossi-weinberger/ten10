import { aggregateDayReport, isAdminFlag, parseGatewayReport, sourceTotals } from "./report.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a gateway report keeps model cost and drops an empty user", () => {
  const rows = parseGatewayReport({
    results: [
      { model: "typesafe-ai/jev", total_cost: 0.07, request_count: 12, input_tokens: 30, output_tokens: 4 },
      { user: "", total_cost: 1, request_count: 1 },
      { day: "2026-10-22", total_cost: 0.04, request_count: 3 },
    ],
  });
  assert(rows.length === 2, "two labeled rows");
  assert(rows[0].label === "typesafe-ai/jev" && rows[0].totalCost === 0.07, "model");
  assert(rows[1].label === "2026-10-22" && rows[1].requestCount === 3, "day");
});

Deno.test("tag totals keep source:app and source:eval and ignore feature tags", () => {
  const totals = sourceTotals({
    results: [
      { tag: "source:app", total_cost: 1.5, request_count: 4, input_tokens: 0, output_tokens: 0 },
      { tag: "intent", total_cost: 1.5, request_count: 4, input_tokens: 0, output_tokens: 0 },
      { tag: "source:eval", total_cost: 0.25, request_count: 1, input_tokens: 0, output_tokens: 0 },
      { tag: "", total_cost: 9, request_count: 9, input_tokens: 0, output_tokens: 0 },
    ],
  });
  assert(totals.app === 1.5, "app");
  assert(totals.evalCost === 0.25, "eval");
});

Deno.test("day rows roll into a Monday UTC week", () => {
  const rolled = aggregateDayReport({
    results: [
      { day: "2026-10-19", total_cost: 0.1, request_count: 1 },
      { day: "2026-10-23", total_cost: 0.2, request_count: 2 },
    ],
  }, "2026-01-01", "2026-12-01");
  assert(rolled.grain === "week", "week grain");
  assert(rolled.buckets.length === 1, "one week");
  assert(rolled.buckets[0].bucket === "2026-10-19", "monday");
  assert(rolled.buckets[0].requestCount === 3, "requests");
});

Deno.test("a non-admin flag is not treated as admin", () => {
  assert(isAdminFlag(true), "true");
  assert(!isAdminFlag(false), "false");
  assert(!isAdminFlag(null), "null");
  assert(!isAdminFlag({}), "object");
});
