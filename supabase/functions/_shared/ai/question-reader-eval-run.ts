import { readModelText } from "./receipt-draft.ts";
import { splitRequestBody, SPLIT_MODEL, SPLIT_RESPONSES_URL } from "./split-prompt.ts";
import { parseSplitPayload } from "./split-response.ts";
import { readSlotEvalFixture, scoreSlotEval, type SlotEvalField } from "./question-slot-eval.ts";

/** Scores the reader's question field. The production path stays on ai-read-question until this passes. */

const TODAY = "2026-11-01";
const FIELDS: SlotEvalField[] = ["family", "measure", "recipient", "category", "payment_method"];

function readKey(path: string): string {
  const file = Deno.readTextFileSync(path);
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

async function ask(key: string, text: string, recipients: readonly string[], categories: readonly string[]): Promise<unknown> {
  const body = splitRequestBody(text, TODAY, { recipients, categories }, "eval");
  const response = await fetch(SPLIT_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      model: SPLIT_MODEL,
      providerOptions: {
        ...body.providerOptions,
        deepseek: { thinking: { type: "disabled" } },
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`http ${response.status} ${detail.slice(0, 180)}`);
  }
  return response.json();
}

const key = readKey(Deno.args[0] ?? "");
const fixturePath = Deno.args[1] ?? "";
const fixture = readSlotEvalFixture(JSON.parse(Deno.readTextFileSync(fixturePath)));
if (!fixture) throw new Error("fixture needs lists and cases");

const answers: Record<string, unknown> = {};
for (const item of fixture.cases) {
  const first = await ask(key, item.text, fixture.lists.recipients, fixture.lists.categories);
  const payload = parseSplitPayload(readModelText(first))
    ? first
    : await ask(key, item.text, fixture.lists.recipients, fixture.lists.categories).catch(() => first);
  const parsed = parseSplitPayload(readModelText(payload));
  const question = parsed?.question ?? null;
  const row: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = question ? question[field] : null;
    row[field] = { choice: value ?? "none", confidence: question ? 1 : 0 };
  }
  answers[item.id] = row;
  console.log(item.id);
}

const score = scoreSlotEval(fixture.cases, answers);
console.log(JSON.stringify({ file: fixturePath, model: SPLIT_MODEL, ...score }));
