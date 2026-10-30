import { readModelText } from "./receipt-draft.ts";
import { splitRequestBody, SPLIT_RESPONSES_URL } from "./split-prompt.ts";
import { parseSplitPayload } from "./split-response.ts";
import { scoreSplit, scoreSplitFields, type SplitExpected, type SplitFieldScore } from "./split-score.ts";
import { buildIntentBody, JEV_SYSTEMONE_URL } from "./jev-intent.ts";
import { gatewaySystemOneBody } from "./jev-duplicate-rank.ts";

/** Args: model, env file, results json path. One row per sentence. Raw text only when the schema did not parse. */

const MODEL = Deno.args[0] ?? "anthropic/claude-sonnet-5";
const ENV_PATH = Deno.args[1] ?? "";
const OUT_PATH = Deno.args[2] ?? "";

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

interface SentenceResult {
  id: string;
  route: SplitFieldScore["route"];
  expectedRoute: SplitExpected["route"];
  parsed: boolean;
  exact: boolean;
  routeOk: boolean;
  fields: SplitFieldScore;
  readerMs: number | null;
  endToEndMs: number | null;
  jev: "ok" | "failed";
  raw: string | null;
}

function rate(correct: number, checked: number): number | null {
  return checked === 0 ? null : Math.round((correct / checked) * 1000) / 1000;
}

function percentile(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]);
}

async function askReader(key: string, item: Case): Promise<unknown> {
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

async function askJev(key: string, text: string): Promise<void> {
  const response = await fetch(JEV_SYSTEMONE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gatewaySystemOneBody(buildIntentBody(text), { source: "eval" })),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`jev http ${response.status}`);
  }
  await response.arrayBuffer();
}

const cases = JSON.parse(Deno.readTextFileSync(new URL("./fixtures/split-eval-cases.json", import.meta.url))) as Case[];
const key = readKey();
const sentences: SentenceResult[] = [];
const endToEnd: number[] = [];
const readerTimes: number[] = [];
let failed = 0;

for (const item of cases) {
  const started = performance.now();
  const readerStarted = performance.now();
  const reader = askReader(key, item).then((payload) => ({
    payload,
    readerMs: Math.round(performance.now() - readerStarted),
  }));
  const jev = askJev(key, item.text).then(() => "ok" as const, () => "failed" as const);
  try {
    const [read, jevResult] = await Promise.all([reader, jev]);
    const endToEndMs = Math.round(performance.now() - started);
    endToEnd.push(endToEndMs);
    readerTimes.push(read.readerMs);
    const text = readModelText(read.payload);
    const parsed = parseSplitPayload(text) !== null;
    const score = scoreSplit(item.text, text, item.today, item.expected);
    const fields = scoreSplitFields(item.text, text, item.today, item.expected);
    sentences.push({
      id: item.id,
      route: fields.route,
      expectedRoute: item.expected.route,
      parsed,
      exact: score.exact,
      routeOk: score.routeOk,
      fields,
      readerMs: read.readerMs,
      endToEndMs,
      jev: jevResult,
      raw: parsed ? null : text,
    });
  } catch (error) {
    failed += 1;
    sentences.push({
      id: item.id,
      route: "unreadable",
      expectedRoute: item.expected.route,
      parsed: false,
      exact: false,
      routeOk: false,
      fields: scoreSplitFields(item.text, "", item.today, item.expected),
      readerMs: null,
      endToEndMs: null,
      jev: "failed",
      raw: error instanceof Error ? error.message : "failed",
    });
  }
}

const fields = sentences.map((sentence) => sentence.fields);
const sum = (pick: (score: SplitFieldScore) => number) => fields.reduce((total, score) => total + pick(score), 0);
const clear = fields.filter((score) => score.clear).length;
const summary = {
  model: MODEL,
  cases: cases.length,
  exact: sentences.filter((sentence) => sentence.exact).length,
  routes: {
    unreadable: fields.filter((score) => score.route === "unreadable").length,
    list: fields.filter((score) => score.route === "list").length,
    several: fields.filter((score) => score.route === "several").length,
  },
  fields: {
    clear,
    amount: rate(sum((score) => score.amountCorrect), sum((score) => score.amountChecked)),
    wrongAnchoredAmount: fields.filter((score) => score.wrongAnchoredAmount).length,
    type: rate(sum((score) => score.typeCorrect), sum((score) => score.typeChecked)),
    specialTypeUnasked: fields.filter((score) => score.specialTypeUnasked).length,
    date: rate(sum((score) => score.dateCorrect), sum((score) => score.dateChecked)),
    unnecessaryQuestions: rate(fields.filter((score) => score.clear && score.unnecessaryQuestion).length, clear),
    specialQuestionWrong: fields.filter((score) => score.specialQuestionWrong).length,
  },
  p95EndToEndMs: percentile(endToEnd),
  readerP95Ms: percentile(readerTimes),
  failed,
  sentences,
};

console.log(JSON.stringify({ ...summary, sentences: sentences.length }, null, 2));
if (OUT_PATH) await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
