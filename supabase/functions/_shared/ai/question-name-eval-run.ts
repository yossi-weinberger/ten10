import { anchoredQuestionName, questionFromSlots } from "./data-question.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "./jev-duplicate-rank.ts";
import { readModelText } from "./receipt-draft.ts";
import { boundsFromPeriod, periodRequestBody, readPeriodPayload, SPLIT_RESPONSES_URL } from "./question-period.ts";
import { buildQuestionSlotBody, predefinedQuestionCategories, readQuestionSlots } from "./question-slots.ts";
import { decideQuestionFilter } from "../../../../src/lib/ai/question-filter.ts";
import { matchUserCategory } from "../../../../src/lib/ai/match-category.ts";

/** Args: env, fixture, results json. Scores the same name decision the app makes. */

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

type NameFamily = "donation" | "expense" | "income" | null;
type NameOutcome = "right_filter" | "needed_ask" | "unnecessary_ask" | "button_miss" | "wrong_filter";

interface NameCase {
  id: string;
  text: string;
  today: string;
  calendar: "gregorian" | "hebrew";
  family: NameFamily;
  recipient: string | null;
  category: string | null;
  buttons: string[] | null;
}

function blank(value: unknown): string | null {
  if (typeof value !== "string" || value === "none" || value.trim() === "") return null;
  return value;
}

function buttonsOf(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((name): name is string => typeof name === "string" && name.trim() !== "");
}

function familyOf(value: unknown): NameFamily {
  if (value === "donation" || value === "expense" || value === "income") return value;
  return null;
}

function loadCases(raw: unknown): { recipients: string[]; categories: string[]; cases: NameCase[] } {
  if (Array.isArray(raw)) {
    const cases = raw.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { id?: unknown; text?: unknown; today?: unknown; calendar?: unknown; expected?: { type?: unknown; recipient?: unknown; topic?: unknown } };
      if (typeof row.id !== "string" || typeof row.text !== "string") return [];
      return [{
        id: row.id,
        text: row.text,
        today: typeof row.today === "string" ? row.today : "2026-11-01",
        calendar: row.calendar === "hebrew" ? "hebrew" as const : "gregorian" as const,
        family: familyOf(row.expected?.type),
        recipient: blank(row.expected?.recipient),
        category: blank(row.expected?.topic),
        buttons: null,
      }];
    });
    return { recipients: [], categories: [], cases };
  }
  const record = raw as { lists?: { recipients?: unknown; categories?: unknown }; cases?: unknown };
  const recipients = Array.isArray(record.lists?.recipients) ? record.lists.recipients.filter((name): name is string => typeof name === "string") : [];
  const categories = Array.isArray(record.lists?.categories) ? record.lists.categories.filter((name): name is string => typeof name === "string") : [];
  const cases = Array.isArray(record.cases) ? record.cases.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { id?: unknown; text?: unknown; language?: unknown; nameButtons?: unknown; expected?: { family?: unknown; recipient?: unknown; category?: unknown } };
    if (typeof row.id !== "string" || typeof row.text !== "string" || !row.expected) return [];
    return [{
      id: row.id,
      text: row.text,
      today: "2026-11-01",
      calendar: row.language === "en" ? "gregorian" as const : "hebrew" as const,
      family: familyOf(row.expected.family),
      recipient: blank(row.expected.recipient),
      category: blank(row.expected.category),
      buttons: buttonsOf(row.nameButtons),
    }];
  }) : [];
  return { recipients, categories, cases };
}

function sameText(left: string, right: string): boolean {
  return left === right || left.toLowerCase() === right.toLowerCase();
}

function expectedName(item: NameCase): string | null {
  if (item.family === "donation") return item.recipient;
  if (item.family) return item.category;
  return null;
}

function namesAgree(applied: string | null, expected: string | null, family: NameFamily): boolean {
  if (applied === expected) return true;
  if (!applied || !expected || family === "donation" || family === null) return false;
  return matchUserCategory(expected, [applied, expected]) === applied;
}

const loaded = loadCases(JSON.parse(Deno.readTextFileSync(FIXTURE)));
loaded.cases.push({
  id: "mixed-donation",
  text: "תרמתי 50 לבית כנסת וכמה תרמתי השנה?",
  today: "2026-11-01",
  calendar: "gregorian",
  family: "donation",
  recipient: null,
  category: null,
  buttons: null,
});
const lists = {
  recipients: loaded.recipients,
  categories: [...new Set([...predefinedQuestionCategories(), ...loaded.categories])],
};
const key = readKey();
const rows: {
  id: string;
  text: string;
  outcome: NameOutcome;
  used: string | null;
  suggestions: string[];
}[] = [];

for (const item of loaded.cases) {
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
  const bounds = boundsFromPeriod(period, item.today);
  const readerPeriod = period?.kind === "all"
    ? { kind: "all" as const }
    : bounds?.from && bounds.to
      ? { kind: "span" as const, from: bounds.from, to: bounds.to }
      : null;
  const bare = anchoredQuestionName(item.text, period?.name_text ?? null, []);
  const nameText = slots?.family
    ? anchoredQuestionName(item.text, bare, slots.family === "donation" ? lists.recipients : lists.categories)
    : bare;
  const question = questionFromSlots(item.text, item.today, item.calendar, slots, readerPeriod, nameText);
  const wanted = expectedName(item);
  const required = item.buttons ?? [];
  let outcome: NameOutcome;
  let used: string | null = null;
  let suggestions: string[] = [];
  if (!question || question === "ask_family" || question === "ask_period") {
    outcome = required.length > 0 ? "button_miss" : wanted ? "wrong_filter" : "right_filter";
  } else {
    const decision = decideQuestionFilter(question, lists);
    if ("missing" in decision) {
      suggestions = decision.suggestions;
      const shown = required.every((name) => suggestions.some((button) => sameText(button, name)));
      outcome = required.length > 0 ? (shown ? "needed_ask" : "button_miss") : "unnecessary_ask";
    } else {
      used = question.type === "donation" ? decision.recipient : decision.category;
      outcome = required.length > 0 || !namesAgree(used, wanted, question.type) ? "wrong_filter" : "right_filter";
    }
  }
  const row = { id: item.id, text: item.text, outcome, used, suggestions };
  rows.push(row);
  console.log(JSON.stringify(row));
}

function ids(outcome: NameOutcome): string[] {
  return rows.filter((row) => row.outcome === outcome).map((row) => `${row.id} ${row.text}`);
}

const summary = {
  cases: rows.length,
  rightFilter: ids("right_filter").length,
  neededAsk: ids("needed_ask").length,
  unnecessaryAsk: ids("unnecessary_ask").length,
  buttonMiss: ids("button_miss").length,
  wrongFilter: ids("wrong_filter").length,
  rightFilterIds: ids("right_filter"),
  neededAskIds: ids("needed_ask"),
  unnecessaryAskIds: ids("unnecessary_ask"),
  buttonMissIds: ids("button_miss"),
  wrongFilterIds: ids("wrong_filter"),
  rows,
};
console.log(JSON.stringify({
  cases: summary.cases,
  rightFilter: summary.rightFilter,
  neededAsk: summary.neededAsk,
  unnecessaryAsk: summary.unnecessaryAsk,
  buttonMiss: summary.buttonMiss,
  wrongFilter: summary.wrongFilter,
  neededAskIds: summary.neededAskIds,
  unnecessaryAskIds: summary.unnecessaryAskIds,
  buttonMissIds: summary.buttonMissIds,
  wrongFilterIds: summary.wrongFilterIds,
}));
if (OUT_PATH) await Deno.writeTextFile(OUT_PATH, JSON.stringify(summary, null, 2) + "\n");
