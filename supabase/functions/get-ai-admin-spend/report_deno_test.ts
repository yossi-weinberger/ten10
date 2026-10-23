import { parseGatewayReport } from "./report.ts";

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
