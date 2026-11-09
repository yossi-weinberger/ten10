import intentCases from "./fixtures/intent-eval-cases.json" with { type: "json" };
import { writeEvalOut } from "./eval-out.ts";
import { buildIntentBody, readIntentChoice } from "./jev-intent.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "./jev-duplicate-rank.ts";

function readGatewayKey(): string {
  const file = Deno.readTextFileSync(new URL("../../../../.env", import.meta.url));
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

interface Row {
  id: string;
  text: string;
  expected: string;
  intent: string | null;
  confidence: number | null;
  raw: unknown;
  reason: "correct" | "wrong_label" | "no_answer";
}

function tokenCount(payload: unknown): { input: number; output: number } {
  if (!payload || typeof payload !== "object") return { input: 0, output: 0 };
  const usage = (payload as { usage?: Record<string, unknown> }).usage;
  if (!usage) return { input: 0, output: 0 };
  const input = usage.input_tokens ?? usage.prompt_tokens;
  const output = usage.output_tokens ?? usage.completion_tokens;
  return {
    input: typeof input === "number" ? input : 0,
    output: typeof output === "number" ? output : 0,
  };
}

async function ask(key: string, text: string): Promise<{ intent: string | null; confidence: number | null; raw: unknown }> {
  const response = await fetch(JEV_SYSTEMONE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gatewaySystemOneBody(buildIntentBody(text), { source: "eval" })),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return { intent: null, confidence: null, raw: { http_status: response.status } };
  const raw = await response.json();
  const choice = readIntentChoice(raw);
  if (!choice) return { intent: null, confidence: null, raw };
  return { intent: choice.intent, confidence: choice.confidence, raw };
}

const key = readGatewayKey();
if (!key) throw new Error("empty gateway key");
const only = new Set((Deno.args[1] ?? "").split(",").filter((id) => id.length > 0));
const selected = only.size === 0 ? intentCases : intentCases.filter((item) => only.has(item.id));
const rows: Row[] = [];
let inputTokens = 0;
let outputTokens = 0;
for (const item of selected) {
  const choice = await ask(key, item.text);
  const tokens = tokenCount(choice.raw);
  inputTokens += tokens.input;
  outputTokens += tokens.output;
  const reason = choice.intent === null ? "no_answer" : choice.intent === item.expected ? "correct" : "wrong_label";
  rows.push({
    id: item.id,
    text: item.text,
    expected: item.expected,
    intent: choice.intent,
    confidence: choice.confidence,
    raw: choice.raw,
    reason,
  });
  console.log(`${item.id} ${choice.intent ?? "none"} ${choice.confidence ?? "none"} ${reason}`);
}

const answered = rows.filter((row) => row.intent !== null);
const correct = answered.filter((row) => row.intent === row.expected);
const wrong = answered.filter((row) => row.intent !== row.expected);
function bounds(values: number[]): { min: number | null; max: number | null } {
  if (values.length === 0) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}
const summary = {
  total: rows.length,
  answered: answered.length,
  correct: correct.length,
  accuracy: answered.length === 0 ? 0 : correct.length / answered.length,
  correctConfidence: bounds(correct.flatMap((row) => row.confidence === null ? [] : [row.confidence])),
  wrongConfidence: bounds(wrong.flatMap((row) => row.confidence === null ? [] : [row.confidence])),
  inputTokens,
  outputTokens,
};
const outName = Deno.args[0] ?? "intent-eval-results.json";
await writeEvalOut(outName, JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary));
