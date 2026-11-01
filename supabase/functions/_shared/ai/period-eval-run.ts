import { parseYearTypeSum } from "./data-question.ts";
import { readModelText } from "./receipt-draft.ts";
import { boundsFromPeriod, periodRequestBody, readPeriodPayload, SPLIT_RESPONSES_URL } from "./question-period.ts";
import { SPLIT_MODEL } from "./split-prompt.ts";

/** Args: env file, results json path. The 81 period questions, against the parser. */

const ENV_PATH = Deno.args[0] ?? "";
const OUT_PATH = Deno.args[1] ?? "";

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
  today: string;
  calendar: "gregorian" | "hebrew";
  expected: { from: string | null; to: string | null } | null;
}

function same(actual: { from: string | null; to: string | null } | null, from: string | null, to: string | null): boolean {
  return (actual?.from ?? null) === from && (actual?.to ?? null) === to;
}

const cases = JSON.parse(Deno.readTextFileSync(new URL("./fixtures/question-slot-eval-cases.json", import.meta.url))) as PeriodCase[];
const key = readKey();
let modelCorrect = 0;
let parserCorrect = 0;
let modelMatchesParser = 0;
const rows: { id: string; modelOk: boolean; parserOk: boolean; from: string | null; to: string | null }[] = [];

for (const item of cases) {
  const wantedFrom = item.expected?.from ?? null;
  const wantedTo = item.expected?.to ?? null;
  const parsed = parseYearTypeSum(item.text, item.today, item.calendar);
  const parserBounds = item.expected === null
    ? (parsed === null ? null : { from: parsed.from, to: parsed.to })
    : (parsed ? { from: parsed.from, to: parsed.to } : null);
  const parserOk = item.expected === null ? parsed === null : same(parserBounds, wantedFrom, wantedTo);
  if (parserOk) parserCorrect += 1;

  const body = periodRequestBody(item.text, item.today, "eval");
  const response = await fetch(SPLIT_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${item.id} http ${response.status} ${detail.slice(0, 180)}`);
  }
  const period = readPeriodPayload(readModelText(await response.json()));
  const bounds = boundsFromPeriod(period, item.today);
  const modelOk = item.expected === null ? period === null : same(bounds, wantedFrom, wantedTo);
  if (modelOk) modelCorrect += 1;
  const agree = item.expected === null
    ? period === null && parsed === null
    : same(bounds, parsed?.from ?? null, parsed?.to ?? null);
  if (agree) modelMatchesParser += 1;
  rows.push({
    id: item.id,
    modelOk,
    parserOk,
    from: bounds?.from ?? null,
    to: bounds?.to ?? null,
  });
  console.log(JSON.stringify({ id: item.id, modelOk, parserOk }));
}

const summary = {
  model: SPLIT_MODEL,
  cases: cases.length,
  modelCorrect,
  parserCorrect,
  modelMatchesParser,
  rows,
};
console.log(JSON.stringify({
  model: summary.model,
  cases: summary.cases,
  modelCorrect,
  parserCorrect,
  modelMatchesParser,
}));
if (OUT_PATH) await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
