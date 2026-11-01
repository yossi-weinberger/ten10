import { readModelText } from "./receipt-draft.ts";
import { splitPrompt, splitRequestBody, SPLIT_RESPONSES_URL, type SplitPromptContext } from "./split-prompt.ts";
import { parseSplitPayload } from "./split-response.ts";

/** Args: env file, results json path. Eight rule sentences, separate from the 264. */

const ENV_PATH = Deno.args[0] ?? "";
const OUT_PATH = Deno.args[1] ?? "";
const TODAY = "2026-11-01";

function readKey(): string {
  const file = Deno.readTextFileSync(ENV_PATH);
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

interface RuleCase {
  id: string;
  text: string;
  expect: string | null;
}

interface Fixture {
  rule: { id: string; name: string; examples?: string[] };
  cases: RuleCase[];
}

function ruleIds(text: string): string[] {
  const parsed = parseSplitPayload(text);
  if (!parsed) return [];
  return parsed.items.flatMap((item) => item.rule_id ? [item.rule_id] : []);
}

function passed(expect: string | null, ids: string[]): boolean {
  if (expect === null) return ids.length === 0;
  return ids.length > 0 && ids.every((id) => id === expect);
}

const fixture = JSON.parse(Deno.readTextFileSync(new URL("./fixtures/rule-eval-cases.json", import.meta.url))) as Fixture;
const context: SplitPromptContext = {
  rules: [{ id: fixture.rule.id, name: fixture.rule.name, examples: fixture.rule.examples }],
};
const promptSeesExamples = splitPrompt(fixture.cases[0]?.text ?? "", TODAY, context).includes("examples:");
const key = readKey();
const rows: { id: string; expect: string | null; ruleIds: string[]; pass: boolean; model: string }[] = [];

for (const item of fixture.cases) {
  const body = splitRequestBody(item.text, TODAY, context, "eval");
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
    throw new Error(`${item.id} http ${response.status} ${detail.slice(0, 240)}`);
  }
  const payload = await response.json();
  const model = readModelText(payload).trim();
  const ids = ruleIds(model);
  const ok = passed(item.expect, ids);
  rows.push({ id: item.id, expect: item.expect, ruleIds: ids, pass: ok, model });
  console.log(JSON.stringify({ id: item.id, expect: item.expect, ruleIds: ids, pass: ok }));
}

const summary = {
  promptSeesExamples,
  cases: rows.length,
  passed: rows.filter((row) => row.pass).length,
  rows,
};
console.log(JSON.stringify({ promptSeesExamples, cases: summary.cases, passed: summary.passed }));
if (OUT_PATH) {
  await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
}
