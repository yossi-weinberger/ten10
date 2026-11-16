import { appDailyCosts, dailyCosts, isAdminFlag, parseGatewayReport, sumCost } from "./report.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function close(left: number, right: number): boolean {
  return Math.abs(left - right) < 1e-12;
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

Deno.test("daily costs are one sorted row per day", () => {
  const days = dailyCosts({
    results: [
      { day: "2026-10-29", total_cost: 0.2, request_count: 2 },
      { day: "2026-10-28", total_cost: 0.1, request_count: 1 },
      { day: "2026-10-28", total_cost: 0.05, request_count: 1 },
      { model: "typesafe-ai/jev", total_cost: 9, request_count: 9 },
    ],
  });
  assert(days.length === 2, "two days");
  assert(days[0].day === "2026-10-28" && close(days[0].totalCost, 0.15) && days[0].requestCount === 2, "merged day");
  assert(days[1].day === "2026-10-29", "sorted");
});

Deno.test("app spend is the day total minus source:eval", () => {
  const total = [
    { day: "2026-10-28", totalCost: 0.5, requestCount: 10 },
    { day: "2026-10-29", totalCost: 0.2, requestCount: 4 },
  ];
  const evalDays = [{ day: "2026-10-28", totalCost: 0.3, requestCount: 6 }];
  const app = appDailyCosts(total, evalDays);
  assert(close(app[0].totalCost, 0.2) && app[0].requestCount === 4, "eval removed");
  assert(close(app[1].totalCost, 0.2) && app[1].requestCount === 4, "no eval that day");
  assert(close(sumCost(app), 0.4), "sum");
});

Deno.test("app spend never goes below zero", () => {
  const app = appDailyCosts(
    [{ day: "2026-10-28", totalCost: 0.1, requestCount: 1 }],
    [{ day: "2026-10-28", totalCost: 0.2, requestCount: 2 }],
  );
  assert(app[0].totalCost === 0 && app[0].requestCount === 0, "clamped");
});

Deno.test("a non-admin flag is not treated as admin", () => {
  assert(isAdminFlag(true), "true");
  assert(!isAdminFlag(false), "false");
  assert(!isAdminFlag(null), "null");
  assert(!isAdminFlag({}), "object");
});
