import { readModelText } from "./receipt-draft.ts";
import { splitRequestBody, SPLIT_RESPONSES_URL } from "./split-prompt.ts";
import { scoreSplit, type SplitExpected } from "./split-score.ts";
const MODEL = Deno.args[0] ?? "anthropic/claude-sonnet-5";
const ENV_PATH = Deno.args[1] ?? "";

function readKey(): string {
  const file = Deno.readTextFileSync(ENV_PATH);
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

interface Case {
  id: string;
  text: string;
  today: string;
  expected: SplitExpected;
}

async function ask(key: string, item: Case): Promise<unknown> {
  const response = await fetch(SPLIT_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...splitRequestBody(item.text, item.today, {}, "eval"), model: MODEL }),
  });
  if (!response.ok) throw new Error(`${item.id} http ${response.status}`);
  return response.json();
}

const cases = JSON.parse(Deno.readTextFileSync(new URL("./fixtures/split-eval-cases.json", import.meta.url))) as Case[];
const key = readKey();
let exact = 0;
let extra = 0;
let missed = 0;
let failed = 0;
const misses: string[] = [];

const latencies: number[] = [];

for (const item of cases) {
  const started = performance.now();
  try {
    const payload = readModelText(await ask(key, item));
    latencies.push(performance.now() - started);
    const score = scoreSplit(item.text, payload, item.today, item.expected);
    extra += score.extra;
    missed += score.missed;
    if (score.exact) exact += 1;
    else misses.push(`${item.id} found ${score.found} missed ${score.missed} extra ${score.extra} route ${score.routeOk}`);
  } catch (error) {
    failed += 1;
    misses.push(`${item.id} ${error instanceof Error ? error.message : "failed"}`);
  }
}

const sorted = [...latencies].sort((left, right) => left - right);
const p95 = sorted.length === 0 ? null : Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]);
const summary = { model: MODEL, cases: cases.length, exact, extra, missed, failed, p95Ms: p95, misses: misses.slice(0, 20) };
console.log(JSON.stringify(summary, null, 2));
if (Deno.args[2]) await Deno.writeTextFile(Deno.args[2], JSON.stringify(summary, null, 2));
