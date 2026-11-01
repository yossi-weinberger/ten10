import { anchoredQuestionName } from "./data-question.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "./jev-duplicate-rank.ts";
import { readModelText } from "./receipt-draft.ts";
import { boundsFromPeriod, periodRequestBody, readPeriodPayload, SPLIT_RESPONSES_URL } from "./question-period.ts";
import { buildQuestionSlotBody, readQuestionSlots } from "./question-slots.ts";

/** Args: env, fixture, results json. Final recipient and category: Jev, then name_text. */

const ENV_PATH = Deno.args[0] ?? "";
const FIXTURE = Deno.args[1] ?? "";
const OUT_PATH = Deno.args[2] ?? "";

function readKey(): string {
  const file = Deno.readTextFileSync(ENV_PATH);
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

interface NameCase {
  id: string;
  text: string;
  today: string;
  calendar: "gregorian" | "hebrew";
  recipient: string | null;
  category: string | null;
}

function blank(value: unknown): string | null {
  if (typeof value !== "string" || value === "none" || value.trim() === "") return null;
  return value;
}

function loadCases(raw: unknown): { recipients: string[]; categories: string[]; cases: NameCase[] } {
  if (Array.isArray(raw)) {
    const cases = raw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { id?: unknown; text?: unknown; today?: unknown; calendar?: unknown; expected?: { recipient?: unknown; topic?: unknown } };
      if (typeof row.id !== "string" || typeof row.text !== "string") return [];
      return [{
        id: row.id,
        text: row.text,
        today: typeof row.today === "string" ? row.today : "2026-11-01",
        calendar: row.calendar === "hebrew" ? "hebrew" as const : "gregorian" as const,
        recipient: blank(row.expected?.recipient),
        category: blank(row.expected?.topic),
      }];
    });
    return { recipients: [], categories: [], cases };
  }
  const record = raw as { lists?: { recipients?: unknown; categories?: unknown }; cases?: unknown };
  const recipients = Array.isArray(record.lists?.recipients) ? record.lists.recipients.filter((name): name is string => typeof name === "string") : [];
  const categories = Array.isArray(record.lists?.categories) ? record.lists.categories.filter((name): name is string => typeof name === "string") : [];
  const cases = Array.isArray(record.cases) ? record.cases.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { id?: unknown; text?: unknown; language?: unknown; expected?: { recipient?: unknown; category?: unknown } };
    if (typeof row.id !== "string" || typeof row.text !== "string" || !row.expected) return [];
    return [{
      id: row.id,
      text: row.text,
      today: "2026-11-01",
      calendar: row.language === "en" ? "gregorian" as const : "hebrew" as const,
      recipient: blank(row.expected.recipient),
      category: blank(row.expected.category),
    }];
  }) : [];
  return { recipients, categories, cases };
}

const loaded = loadCases(JSON.parse(Deno.readTextFileSync(FIXTURE)));
loaded.cases.push({
  id: "mixed-donation",
  text: "תרמתי 50 לבית כנסת וכמה תרמתי השנה?",
  today: "2026-11-01",
  calendar: "gregorian",
  recipient: null,
  category: null,
});
const key = readKey();
let recipientCorrect = 0;
let categoryCorrect = 0;
const rows: unknown[] = [];

for (const item of loaded.cases) {
  const lists = { recipients: loaded.recipients, categories: loaded.categories };
  const [slotResponse, periodResponse] = await Promise.all([
    fetch(JEV_SYSTEMONE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(gatewaySystemOneBody(buildQuestionSlotBody(item.text, lists), { source: "eval" })),
    }),
    fetch(SPLIT_RESPONSES_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(periodRequestBody(item.text, item.today, "eval", item.calendar)),
    }),
  ]);
  const slotPayload = slotResponse.ok ? await slotResponse.json() : null;
  const periodPayload = periodResponse.ok ? await periodResponse.json() : null;
  const slots = readQuestionSlots(slotPayload, lists);
  const period = readPeriodPayload(readModelText(periodPayload));
  const bare = anchoredQuestionName(item.text, period?.name_text ?? null, []);
  const family = slots?.family ?? null;
  const listed = family
    ? anchoredQuestionName(item.text, bare, family === "donation" ? lists.recipients : lists.categories)
    : bare;
  const recipient = family === "donation" ? slots?.recipient ?? listed : null;
  const category = family && family !== "donation" ? slots?.category ?? listed : null;
  const recipientOk = recipient === item.recipient;
  const categoryOk = category === item.category;
  if (recipientOk) recipientCorrect += 1;
  if (categoryOk) categoryCorrect += 1;
  const row = {
    id: item.id,
    family,
    nameText: period?.name_text ?? null,
    period: boundsFromPeriod(period, item.today),
    recipient,
    category,
    recipientOk,
    categoryOk,
  };
  rows.push(row);
  console.log(JSON.stringify(row));
}

const summary = {
  cases: loaded.cases.length,
  recipientCorrect,
  categoryCorrect,
  rows,
};
console.log(JSON.stringify({ cases: summary.cases, recipientCorrect, categoryCorrect }));
if (OUT_PATH) await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
