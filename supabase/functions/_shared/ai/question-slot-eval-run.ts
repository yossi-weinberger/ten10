import { buildQuestionSlotBody } from "./question-slots.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "./jev-duplicate-rank.ts";
import { readSlotEvalFixture, scoreSlotEval, SLOT_EVAL_FIELDS } from "./question-slot-eval.ts";

function readGatewayKey(): string {
  const file = Deno.readTextFileSync(new URL("../../../../.env", import.meta.url));
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

const fixturePath = Deno.args[0];
const resultsPath = Deno.args[1];
if (!fixturePath || !resultsPath) throw new Error("usage: question-slot-eval-run.ts <fixture.json> <results.json>");

const fixture = readSlotEvalFixture(JSON.parse(Deno.readTextFileSync(fixturePath)));
if (!fixture) throw new Error("fixture needs lists and cases");

const key = readGatewayKey();
const answers: Record<string, unknown> = {};
for (const item of fixture.cases) {
  const response = await fetch(JEV_SYSTEMONE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(gatewaySystemOneBody(buildQuestionSlotBody(item.text, fixture.lists), {
      source: "eval",
      feature: "question_slots",
    })),
    signal: AbortSignal.timeout(20000),
  });
  const payload = response.ok ? await response.json() : null;
  const raw = payload && typeof payload === "object" ? (payload as { answers?: unknown }).answers : null;
  answers[item.id] = raw && typeof raw === "object" ? raw : {};
  console.log(item.id);
}

const summary = scoreSlotEval(fixture.cases, answers);
Deno.writeTextFileSync(resultsPath, JSON.stringify({ summary, answers }, null, 2));
console.log(JSON.stringify({
  total: summary.total,
  correct: summary.correct,
  missed: summary.missed,
  confidentWrong: summary.confidentWrong,
  byField: Object.fromEntries(SLOT_EVAL_FIELDS.map((field) => [field, summary.byField[field]])),
}));
