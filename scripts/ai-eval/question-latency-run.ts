import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "../../supabase/functions/_shared/ai/jev-duplicate-rank.ts";
import { periodRequestBody, SPLIT_RESPONSES_URL } from "../../supabase/functions/_shared/ai/question-period.ts";
import { buildQuestionSlotBody } from "../../supabase/functions/_shared/ai/question-slots.ts";

/** Args: env file. p95 of a data question: slots and period in parallel. */

const ENV_PATH = Deno.args[0] ?? "";

function readKey(): string {
  const file = Deno.readTextFileSync(ENV_PATH);
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

interface PeriodCase {
  id: string;
  text: string;
  today?: string;
  calendar?: "gregorian" | "hebrew";
}

const cases = JSON.parse(Deno.readTextFileSync(
  new URL("./fixtures/question-slot-eval-cases.json", import.meta.url),
)) as PeriodCase[];
const key = readKey();
const times: number[] = [];

for (const item of cases) {
  const today = item.today ?? "2026-11-01";
  const calendar = item.calendar ?? "gregorian";
  const slots = buildQuestionSlotBody(item.text, { recipients: [], categories: [] });
  const started = performance.now();
  const [slotResponse, periodResponse] = await Promise.all([
    fetch(JEV_SYSTEMONE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(gatewaySystemOneBody(slots, { source: "eval" })),
    }),
    fetch(SPLIT_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(periodRequestBody(item.text, today, "eval", calendar)),
    }),
  ]);
  await slotResponse.arrayBuffer();
  await periodResponse.arrayBuffer();
  const ms = Math.round(performance.now() - started);
  times.push(ms);
  console.log(JSON.stringify({ id: item.id, ms, slots: slotResponse.status, period: periodResponse.status }));
}

const sorted = [...times].sort((left, right) => left - right);
const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
const p50 = sorted[Math.floor(sorted.length * 0.5)];
console.log(JSON.stringify({ cases: times.length, p50, p95 }));
