import { buildIntentBody, INTAKE_COUNTS, readCountChoice, readIntentChoice } from "./jev-intent.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "./jev-duplicate-rank.ts";
import { effectiveIntakeCount } from "./intake-count.ts";
import { INTAKE_INTENTS, type IntakeIntent } from "./intent.ts";
import { type EvalAnswer, type LabelEvalSummary, readLabelEvalCases, scoreLabelEval } from "./intent-count-eval.ts";

const COUNT_FIXTURE = "intent-count-eval-cases.json";
const INTENT_FIXTURES = ["intent-eval-cases.json", "intent-eval-inbox.json"] as const;

function readFixture(name: string): unknown {
  const url = new URL(`./fixtures/${name}`, import.meta.url);
  try {
    return JSON.parse(Deno.readTextFileSync(url));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`missing fixtures/${name}. Add the supplied sentences first; this run does not write them.`);
    }
    throw error;
  }
}

function readGatewayKey(): string {
  const file = Deno.readTextFileSync(new URL("../../../../.env", import.meta.url));
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

interface Answers {
  intent: EvalAnswer;
  count: EvalAnswer;
}

const NONE: EvalAnswer = { choice: null, confidence: null };

async function ask(key: string, text: string): Promise<Answers> {
  const response = await fetch(JEV_SYSTEMONE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gatewaySystemOneBody(buildIntentBody(text), { source: "eval" })),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) return { intent: NONE, count: NONE };
  const payload = await response.json();
  const intent = readIntentChoice(payload);
  const count = readCountChoice(payload);
  return {
    intent: intent ? { choice: intent.intent, confidence: intent.confidence } : NONE,
    count: count ? { choice: count.count, confidence: count.confidence } : NONE,
  };
}

// Every fixture is read before the first call, so a missing set fails without spending.
const countCases = readLabelEvalCases(readFixture(COUNT_FIXTURE), INTAKE_COUNTS);
const intentSets = INTENT_FIXTURES.map((name) => ({
  name,
  cases: readLabelEvalCases(readFixture(name), INTAKE_INTENTS),
}));

const key = readGatewayKey();
if (!key) throw new Error("empty gateway key");

const countAnswers: Record<string, EvalAnswer> = {};
const effectiveAnswers: Record<string, EvalAnswer> = {};
for (const item of countCases) {
  const { count } = await ask(key, item.text);
  countAnswers[item.id] = count;
  const jevCount = INTAKE_COUNTS.find((label) => label === count.choice) ?? null;
  effectiveAnswers[item.id] = {
    choice: effectiveIntakeCount(item.text, jevCount, count.confidence),
    confidence: null,
  };
  console.log(`${item.id} ${count.choice ?? "none"} ${count.confidence ?? "none"} ${effectiveAnswers[item.id].choice}`);
}

const intentSummaries: Record<string, LabelEvalSummary<IntakeIntent>> = {};
for (const set of intentSets) {
  const answers: Record<string, EvalAnswer> = {};
  for (const item of set.cases) {
    answers[item.id] = (await ask(key, item.text)).intent;
    console.log(`${set.name} ${item.id} ${answers[item.id].choice ?? "none"} ${answers[item.id].confidence ?? "none"}`);
  }
  intentSummaries[set.name] = scoreLabelEval(set.cases, answers, INTAKE_INTENTS);
}

const summary = {
  count: scoreLabelEval(countCases, countAnswers, INTAKE_COUNTS),
  effectiveCount: scoreLabelEval(countCases, effectiveAnswers, INTAKE_COUNTS),
  intent: intentSummaries,
};
const out = new URL("./fixtures/intent-count-eval-results.json", import.meta.url);
Deno.writeTextFileSync(out, JSON.stringify({ summary, countAnswers }, null, 2));
console.log(JSON.stringify({
  count: { accuracy: summary.count.accuracy, byLabel: summary.count.byLabel, confidentWrong: summary.count.confidentWrong },
  effectiveCount: { accuracy: summary.effectiveCount.accuracy, byLabel: summary.effectiveCount.byLabel },
  intent: Object.fromEntries(
    Object.entries(intentSummaries).map(([name, value]) => [
      name,
      { correct: value.correct, total: value.total, confidentWrong: value.confidentWrong },
    ]),
  ),
}));
