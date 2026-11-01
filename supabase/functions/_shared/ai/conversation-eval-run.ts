import { buildIntentBody, readHalachaChoice, readIntentChoice } from "./jev-intent.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "./jev-duplicate-rank.ts";
import { readModelText } from "./receipt-draft.ts";
import { readModelUsage } from "./model-call.ts";
import { parseSplitPayload, readSplitResponse } from "./split-response.ts";
import { splitReadContext } from "./split-anchor.ts";
import { splitRequestBody, SPLIT_RESPONSES_URL } from "./split-prompt.ts";
import { buildQuestionSlotBody, predefinedQuestionCategories, readQuestionSlots } from "./question-slots.ts";
import { boundsFromPeriod, periodRequestBody, readPeriodPayload } from "./question-period.ts";
import { decideTurn, emptyConversation, summarizeTurn, type TurnQuestion, type TurnSummary } from "../../../../src/lib/ai/assistant-turn.ts";

interface ExpectTurn {
  kind: string;
  /** Another answer that is also right, such as a published page instead of the rabbi card. */
  alsoOk?: string[];
  amount?: number;
  type?: string;
  date?: string;
  frequency?: string;
  day?: number;
  family?: string;
  pending?: string | null;
}

interface FixtureTurn {
  user: string;
  expect: ExpectTurn;
}

interface FixtureConversation {
  id: string;
  topic: string;
  turns: FixtureTurn[];
}

interface Fixture {
  today: string;
  calendar: "gregorian" | "hebrew";
  recipients: string[];
  conversations: FixtureConversation[];
}

const TOPIC_COUNTS: Record<string, number> = {
  real_chat: 1,
  draft_fix: 6,
  assistant_answer: 8,
  data_followup: 5,
  recurring_fact: 5,
  special_same_message: 3,
  balance: 4,
  halacha: 5,
  greeting_help_oos: 4,
  new_topic_while_pending: 3,
  stale_amount: 3,
  discard_draft: 3,
  receipt_then_fix: 2,
  inspiration_more: 1,
  multi_request: 2,
};

function readGatewayKey(): string {
  const file = Deno.readTextFileSync(new URL("../../../../.env", import.meta.url));
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("VERCEL_AI_GATEWAY_API_KEY=")) continue;
    return line.slice("VERCEL_AI_GATEWAY_API_KEY=".length).trim();
  }
  throw new Error("missing gateway key");
}

function assertTopics(conversations: FixtureConversation[]) {
  const counts: Record<string, number> = {};
  for (const conversation of conversations) counts[conversation.topic] = (counts[conversation.topic] ?? 0) + 1;
  for (const [topic, expected] of Object.entries(TOPIC_COUNTS)) {
    if (counts[topic] !== expected) throw new Error(`${topic} has ${counts[topic] ?? 0}, expected ${expected}`);
  }
  if (!conversations.some((conversation) => conversation.id === "conv-001")) throw new Error("missing conv-001");
}

async function post(key: string, url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) return { http_status: response.status };
  return response.json();
}

function statusOf(payload: unknown): number {
  const status = (payload as { http_status?: unknown } | null)?.http_status;
  return typeof status === "number" ? status : 200;
}

async function askJev(key: string, text: string): Promise<unknown> {
  return post(key, JEV_SYSTEMONE_URL, gatewaySystemOneBody(buildIntentBody(text), { source: "eval" }));
}

async function askReader(key: string, text: string, fixture: Fixture, categories: string[]): Promise<unknown> {
  const body = splitRequestBody(text, fixture.today, {
    categories,
    recipients: fixture.recipients,
    calendar: fixture.calendar,
  }, "eval");
  const first = await post(key, SPLIT_RESPONSES_URL, body);
  if (parseSplitPayload(readModelText(first))) return first;
  return post(key, SPLIT_RESPONSES_URL, body);
}

async function askQuestion(
  key: string,
  text: string,
  fixture: Fixture,
  lists: { recipients: string[]; categories: string[] },
): Promise<{ question: TurnQuestion; costUsd: number }> {
  const [slotsPayload, periodPayload] = await Promise.all([
    post(key, JEV_SYSTEMONE_URL, gatewaySystemOneBody(buildQuestionSlotBody(text, lists), { source: "eval" })),
    post(key, SPLIT_RESPONSES_URL, periodRequestBody(text, fixture.today, "eval", fixture.calendar)),
  ]);
  const costUsd = (readModelUsage(slotsPayload).costUsd ?? 0) + (readModelUsage(periodPayload).costUsd ?? 0);
  const slots = readQuestionSlots(slotsPayload, lists);
  const raw = readPeriodPayload(readModelText(periodPayload));
  const nameText = raw?.name_text ?? null;
  // Like ai-read-question: no slots means unavailable, and the drawer falls back to the reader.
  if (!slots) return { question: null, costUsd };
  if (raw?.kind === "all") {
    return { question: { slots, period: { kind: "all" }, nameText }, costUsd };
  }
  const bounds = boundsFromPeriod(raw, fixture.today);
  const period = bounds?.from && bounds.to ? { kind: "span" as const, from: bounds.from, to: bounds.to } : null;
  return { question: { slots, period, nameText }, costUsd };
}

function flagsFor(expect: ExpectTurn, summary: TurnSummary): string[] {
  const flags: string[] = [];
  const accepted = [expect.kind, ...(expect.alsoOk ?? [])];
  const card = summary.kind === "draft" || summary.kind === "drafts" || summary.kind === "recurring";
  if (card && expect.amount !== undefined && summary.amount !== expect.amount) flags.push("wrong_save");
  if (card && expect.type !== undefined && summary.type !== expect.type) flags.push("wrong_save");
  if (card && expect.date !== undefined && summary.date !== expect.date) flags.push("wrong_save");
  if (summary.kind === "recurring" && expect.frequency !== undefined && summary.frequency !== expect.frequency) flags.push("wrong_save");
  if (summary.kind === "recurring" && expect.day !== undefined && summary.day !== expect.day) flags.push("wrong_save");
  if (expect.kind === "recurring" && (summary.kind === "draft" || summary.kind === "drafts")) flags.push("recurring_as_one_time");
  if ((summary.kind === "out_of_scope" || summary.kind === "could_not_read") && !accepted.includes("out_of_scope")) flags.push("dead_end");
  if (summary.kind === "question" && !accepted.includes("question")) flags.push("unnecessary_question");
  return [...new Set(flags)];
}

function fieldsMatch(expect: ExpectTurn, summary: TurnSummary): boolean {
  if (expect.amount !== undefined && summary.kind !== "question" && summary.amount !== expect.amount) return false;
  if (expect.type !== undefined && summary.kind !== "question" && summary.type !== expect.type) return false;
  if (expect.frequency !== undefined && summary.frequency !== expect.frequency) return false;
  if (expect.day !== undefined && summary.day !== expect.day) return false;
  if (expect.family !== undefined && summary.family !== expect.family) return false;
  if (expect.pending !== undefined && summary.pending !== expect.pending) return false;
  return true;
}

async function runConversation(
  key: string,
  fixture: Fixture,
  conversation: FixtureConversation,
  categories: string[],
) {
  const lists = { recipients: fixture.recipients, categories };
  const rows = [];
  for (const [index, turn] of conversation.turns.entries()) {
    const [jevRaw, readerRaw] = await Promise.all([
      askJev(key, turn.user),
      askReader(key, turn.user, fixture, categories),
    ]);
    const intent = readIntentChoice(jevRaw);
    const page = readHalachaChoice(jevRaw);
    const split = readSplitResponse(turn.user, readModelText(readerRaw), splitReadContext(fixture.today, {
      categories,
      recipients: fixture.recipients,
    }));
    const reader = split.route === "several"
      ? { ok: true as const, route: "several" as const, items: split.items, dropped: split.dropped, rule: split.rule, question: split.question }
      : { ok: true as const, route: split.route };
    const first = decideTurn({
      message: turn.user,
      jev: intent
        ? { ok: true, intent: intent.intent, confidence: intent.confidence, halachaPage: page?.page ?? null, halachaPageConfidence: page?.confidence ?? null }
        : { ok: false },
      reader,
      question: null,
      questionAttempted: false,
      state: emptyConversation(),
      today: fixture.today,
      calendar: fixture.calendar,
    });
    const asked = first.needsQuestion ? await askQuestion(key, turn.user, fixture, lists) : null;
    const question = asked?.question ?? null;
    const decision = first.needsQuestion
      ? decideTurn({
        message: turn.user,
        jev: intent
          ? { ok: true, intent: intent.intent, confidence: intent.confidence, halachaPage: page?.page ?? null, halachaPageConfidence: page?.confidence ?? null }
          : { ok: false },
        reader,
        question,
        questionAttempted: true,
        state: emptyConversation(),
        today: fixture.today,
        calendar: fixture.calendar,
      })
      : first;
    const summary = summarizeTurn({
      message: turn.user,
      jev: { ok: false },
      reader,
      question,
      questionAttempted: question !== null,
      state: emptyConversation(),
      today: fixture.today,
      calendar: fixture.calendar,
    }, decision);
    const flags = flagsFor(turn.expect, summary);
    const kindOk = summary.kind === turn.expect.kind || (turn.expect.alsoOk ?? []).includes(summary.kind);
    const turnCorrect = kindOk && fieldsMatch(turn.expect, summary) && flags.length === 0;
    const reason = turnCorrect ? "turn_correct" : flags[0] ?? "wrong_kind";
    const usage = [readModelUsage(jevRaw), readModelUsage(readerRaw)];
    rows.push({
      id: `${conversation.id}-${index + 1}`,
      conversation: conversation.id,
      topic: conversation.topic,
      user: turn.user,
      context: "",
      expect: turn.expect,
      summary,
      jev: {
        intent: intent?.intent ?? null,
        confidence: intent?.confidence ?? null,
        page: page?.page ?? null,
        answers: (jevRaw as { answers?: unknown } | null)?.answers ?? null,
      },
      // ponytail: the model's text only, cut at 2000 characters, so a run stays well under 1MB.
      readerText: readModelText(readerRaw).slice(0, 2000),
      httpStatus: { jev: statusOf(jevRaw), reader: statusOf(readerRaw) },
      question,
      decision,
      reason,
      flags,
      costUsd: usage.reduce((sum, row) => sum + (row.costUsd ?? 0), 0) + (asked?.costUsd ?? 0),
    });
    console.log(`${conversation.id}-${index + 1} ${summary.kind} ${reason}`);
  }
  return rows;
}

const fixture = JSON.parse(Deno.readTextFileSync(new URL("./fixtures/conversation-eval-cases.json", import.meta.url))) as Fixture;
assertTopics(fixture.conversations);
const only = new Set((Deno.args[1] ?? "").split(",").filter((id) => id.length > 0));
const selected = only.size === 0 ? fixture.conversations : fixture.conversations.filter((conversation) => only.has(conversation.id));
const key = readGatewayKey();
const categories = predefinedQuestionCategories();
const started = Date.now();
const nested = [];
for (const conversation of selected) nested.push(await runConversation(key, fixture, conversation, categories));
const rows = nested.flat();
const turns = rows.length;
function count(flag: string): number {
  return rows.filter((row) => row.reason === flag || row.flags.includes(flag)).length;
}
const summary = {
  turns,
  conversations: selected.length,
  turn_correct: rows.filter((row) => row.reason === "turn_correct").length,
  turn_correct_rate: turns === 0 ? 0 : rows.filter((row) => row.reason === "turn_correct").length / turns,
  wrong_save: count("wrong_save"),
  recurring_as_one_time: count("recurring_as_one_time"),
  dead_end: count("dead_end"),
  unnecessary_question: count("unnecessary_question"),
  unnecessary_question_rate: turns === 0 ? 0 : count("unnecessary_question") / turns,
  costUsd: Math.round(rows.reduce((sum, row) => sum + row.costUsd, 0) * 1e6) / 1e6,
  elapsedMs: Date.now() - started,
  runs: 1,
};
const outName = Deno.args[0] ?? "conversation-eval-baseline.json";
if (outName.includes("/") || outName.includes("\\")) throw new Error("pass a file name, not a path");
Deno.writeTextFileSync(new URL(`./fixtures/${outName}`, import.meta.url), JSON.stringify({ summary, rows }, null, 2));
console.log(JSON.stringify(summary));
