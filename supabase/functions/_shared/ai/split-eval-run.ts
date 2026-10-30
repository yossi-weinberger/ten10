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
  reasoningTokens: number | null;
  model: string | null;
}

function rate(correct: number, checked: number): number | null {
  return checked === 0 ? null : Math.round((correct / checked) * 1000) / 1000;
}

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))]);
}

function shorten(text: string): string {
  const trimmed = text.trim();
  return trimmed.length <= 800 ? trimmed : `${trimmed.slice(0, 800)}…`;
}

function reasoningTokens(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const usage = (payload as { usage?: { output_tokens_details?: { reasoning_tokens?: unknown } } }).usage;
  const value = usage?.output_tokens_details?.reasoning_tokens;
  return typeof value === "number" ? value : null;
}

async function askReaderOnce(key: string, item: Case): Promise<unknown> {
  const response = await fetch(SPLIT_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...splitRequestBody(item.text, item.today, {}, "eval"), model: MODEL }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${item.id} http ${response.status} ${detail.slice(0, 240)}`);
  }
  return response.json();
}

async function askReader(key: string, item: Case): Promise<unknown> {
  const first = await askReaderOnce(key, item);
  if (parseSplitPayload(readModelText(first))) return first;
  try {
    return await askReaderOnce(key, item);
  } catch {
    return first;
  }
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
      reasoningTokens: reasoningTokens(read.payload),
      model: shorten(text),
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
      reasoningTokens: null,
      model: error instanceof Error ? error.message : "failed",
    });
  }
}

function blindGroup(id: string): "old" | "new" | null {
  const hebrew = /^blind-he-(\d+)$/.exec(id);
  const english = /^blind-en-(\d+)$/.exec(id);
  if (hebrew) return Number(hebrew[1]) <= 33 ? "old" : "new";
  if (english) return Number(english[1]) <= 12 ? "old" : "new";
  return null;
}

function routeCounts(rows: SentenceResult[]) {
  return {
    n: rows.length,
    unreadable: rows.filter((row) => row.route === "unreadable").length,
    list: rows.filter((row) => row.route === "list").length,
    several: rows.filter((row) => row.route === "several").length,
  };
}

function fieldReport(rows: SentenceResult[]) {
  const scores = rows.map((row) => row.fields);
  const sum = (pick: (score: SplitFieldScore) => number) => scores.reduce((total, score) => total + pick(score), 0);
  const clearRows = scores.filter((score) => score.clear);
  return {
    cases: rows.length,
    exact: rows.filter((row) => row.exact).length,
    routes: routeCounts(rows),
    expectedList: routeCounts(rows.filter((row) => row.expectedRoute === "list")),
    clear: clearRows.length,
    amount: rate(sum((score) => score.amountCorrect), sum((score) => score.amountChecked)),
    wrongAnchoredAmount: scores.filter((score) => score.wrongAnchoredAmount).length,
    type: rate(sum((score) => score.typeCorrect), sum((score) => score.typeChecked)),
    specialTypeUnasked: scores.filter((score) => score.specialTypeUnasked).length,
    date: rate(sum((score) => score.dateCorrect), sum((score) => score.dateChecked)),
    unnecessaryQuestions: rate(clearRows.filter((score) => score.unnecessaryQuestion).length, clearRows.length),
    specialQuestionWrong: scores.filter((score) => score.specialQuestionWrong).length,
    checkAmounts: sum((score) => score.checkAmounts),
    specialAsked: sum((score) => score.specialAsked),
  };
}

const fields = sentences.map((sentence) => sentence.fields);
const sum = (pick: (score: SplitFieldScore) => number) => fields.reduce((total, score) => total + pick(score), 0);
const clear = fields.filter((score) => score.clear).length;
const summary = {
  model: MODEL,
  cases: cases.length,
  exact: sentences.filter((sentence) => sentence.exact).length,
  routes: routeCounts(sentences),
  expectedList: routeCounts(sentences.filter((row) => row.expectedRoute === "list")),
  groups: {
    blindOld: fieldReport(sentences.filter((row) => blindGroup(row.id) === "old")),
    blindNew: fieldReport(sentences.filter((row) => blindGroup(row.id) === "new")),
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
    checkAmounts: sum((score) => score.checkAmounts),
    specialAsked: sum((score) => score.specialAsked),
  },
  p50EndToEndMs: percentile(endToEnd, 0.5),
  p95EndToEndMs: percentile(endToEnd, 0.95),
  readerP95Ms: percentile(readerTimes, 0.95),
  reasoningTokens: sentences.map((sentence) => sentence.reasoningTokens).filter((value) => value !== null),
  failed,
  sentences,
};

console.log(JSON.stringify({ ...summary, sentences: sentences.length }, null, 2));
if (OUT_PATH) {
  await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
  const saved = JSON.parse(await Deno.readTextFile(OUT_PATH)) as { sentences?: { model?: unknown }[] };
  const kept = (saved.sentences ?? []).filter((sentence) => typeof sentence.model === "string" && sentence.model.length > 0);
  if (kept.length !== sentences.length) throw new Error(`model text saved ${kept.length}/${sentences.length}`);
  console.log(`saved model text ${kept.length}/${sentences.length}`);
}
