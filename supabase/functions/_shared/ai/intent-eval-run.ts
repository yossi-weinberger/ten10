import intentCases from "./fixtures/intent-eval-cases.json" with { type: "json" };
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
  expected: string;
  intent: string | null;
  confidence: number | null;
}

async function ask(key: string, text: string): Promise<{ intent: string | null; confidence: number | null }> {
  const response = await fetch(JEV_SYSTEMONE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gatewaySystemOneBody(buildIntentBody(text), { source: "eval", feature: "intent" })),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return { intent: null, confidence: null };
  const choice = readIntentChoice(await response.json());
  if (!choice) return { intent: null, confidence: null };
  return { intent: choice.intent, confidence: choice.confidence };
}

const key = readGatewayKey();
if (!key) throw new Error("empty gateway key");
const rows: Row[] = [];
for (const item of intentCases) {
  const choice = await ask(key, item.text);
  rows.push({ id: item.id, expected: item.expected, intent: choice.intent, confidence: choice.confidence });
  console.log(`${item.id} ${choice.intent ?? "none"} ${choice.confidence ?? "none"}`);
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
};
const out = new URL("./fixtures/intent-eval-results.json", import.meta.url);
Deno.writeTextFileSync(out, JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary));
