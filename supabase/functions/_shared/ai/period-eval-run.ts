import { parseQuestionPeriod } from "./data-question.ts";
import { readModelText } from "./receipt-draft.ts";
import { boundsFromPeriod, periodRequestBody, readPeriodPayload, SPLIT_RESPONSES_URL } from "./question-period.ts";
import { SPLIT_MODEL } from "./split-prompt.ts";

/** Args: env file, results json path, optional fixture path. Period bounds against the parser. */

const ENV_PATH = Deno.args[0] ?? "";
const OUT_PATH = Deno.args[1] ?? "";
const FIXTURE = Deno.args[2] ?? new URL("./fixtures/question-slot-eval-cases.json", import.meta.url);

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
  language?: string;
  expected: { from: string | null; to: string | null } | null;
}

function casesFrom(raw: unknown): PeriodCase[] {
  if (Array.isArray(raw)) return raw as PeriodCase[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { cases?: unknown }).cases)) {
    return (raw as { cases: PeriodCase[] }).cases;
  }
  throw new Error("fixture needs cases");
}

function same(
  actual: { from: string | null; to: string | null } | null,
  from: string | null,
  to: string | null,
): boolean {
  return (actual?.from ?? null) === from && (actual?.to ?? null) === to;
}

const cases = casesFrom(JSON.parse(Deno.readTextFileSync(FIXTURE)));
const key = readKey();
let modelCorrect = 0;
let labeled = 0;
let labeledCorrect = 0;
const rows: {
  id: string;
  text: string;
  modelOk: boolean;
  from: string | null;
  to: string | null;
  parserFrom: string | null;
  parserTo: string | null;
  model: string;
  nameText: string | null;
}[] = [];

for (const item of cases) {
  const today = item.today ?? "2026-11-01";
  const calendar = item.calendar ?? (item.language === "en" ? "gregorian" : "hebrew");
  const normalized = item.text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
  const parsed = parseQuestionPeriod(normalized, today, calendar);
  const parserFrom = parsed?.from ?? null;
  const parserTo = parsed?.to ?? null;
  const body = periodRequestBody(item.text, today, "eval", calendar);
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
  const model = readModelText(await response.json()).trim();
  const read = readPeriodPayload(model);
  const bounds = boundsFromPeriod(read, today);
  const modelOk = same(bounds, parserFrom, parserTo);
  if (modelOk) modelCorrect += 1;
  if (item.expected && "from" in item.expected) {
    labeled += 1;
    if (same(bounds, item.expected.from, item.expected.to)) labeledCorrect += 1;
  }
  rows.push({
    id: item.id,
    text: item.text,
    modelOk,
    from: bounds?.from ?? null,
    to: bounds?.to ?? null,
    parserFrom,
    parserTo,
    model,
    nameText: read?.name_text ?? null,
  });
  console.log(JSON.stringify({ id: item.id, modelOk, from: bounds?.from ?? null, to: bounds?.to ?? null }));
}

const summary = {
  model: SPLIT_MODEL,
  fixture: String(FIXTURE),
  cases: cases.length,
  modelCorrect,
  labeled,
  labeledCorrect,
  rows,
};
console.log(JSON.stringify({
  model: summary.model,
  cases: summary.cases,
  modelCorrect,
  labeled,
  labeledCorrect,
}));
if (OUT_PATH) await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
