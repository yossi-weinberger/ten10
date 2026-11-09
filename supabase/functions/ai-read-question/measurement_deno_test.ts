import { saveQuestionMeasurement } from "./measurement.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a data question records one measurement row", async () => {
  const calls: Array<{ p_user_id: string; p_signals: Record<string, number> }> = [];
  const id = await saveQuestionMeasurement(async (args) => {
    calls.push(args);
    return { data: "11111111-1111-1111-1111-111111111111", error: null };
  }, "01665dce-d261-4a9b-b89d-04ce2460859b", { family: 0.88 });
  assert(calls.length === 1, "one row");
  assert(calls[0].p_signals.family === 0.88, "signals");
  assert(id === "11111111-1111-1111-1111-111111111111", "id");
});
