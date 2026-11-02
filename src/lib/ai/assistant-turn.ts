import type { IntakeIntent } from "../../../supabase/functions/_shared/ai/intent.ts";
import { questionFromSlots, type YearTypeSum } from "../../../supabase/functions/_shared/ai/data-question.ts";
import type { QuestionSlots } from "../../../supabase/functions/_shared/ai/question-slots.ts";
import { statedSpecialType, type AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import type { ResolvedQuestion } from "../../../supabase/functions/_shared/ai/split-response.ts";
import { namedHalachaPage, shownIntent, type ShownIntent } from "../../components/ai-intake/assistant-shown-intent.ts";
import { yearSumFromReader } from "./reader-question.ts";
import { conversationContext } from "../../../supabase/functions/_shared/ai/conversation-context.ts";

export type PendingKind = "amount" | "period" | "family" | "name";

export interface ConversationOnScreen {
  kind: "draft" | "recurring" | "data_answer" | "halacha" | "inspiration" | "saved";
  sourceText: string;
  /** What the code tells the models about this card. Never the assistant's own wording. */
  line: string;
  savedItemId?: string;
}

export interface ConversationState {
  recentUserTexts: string[];
  receiptText: string | null;
  onScreen: ConversationOnScreen | null;
  pending: { kind: PendingKind; sourceText: string } | null;
}

export function emptyConversation(): ConversationState {
  return { recentUserTexts: [], receiptText: null, onScreen: null, pending: null };
}

const REMEMBERED_TEXTS = 3;
const MAX_REMEMBERED_TEXT = 400;

/** The block the models get before the message: earlier user words, the open card, and the pending question. */
export function contextFor(state: ConversationState): string {
  return conversationContext({
    recentUserTexts: state.recentUserTexts,
    receiptText: state.receiptText,
    screenLine: state.onScreen?.line ?? null,
    waitingFor: state.pending?.kind ?? null,
  });
}

/** A draft or standing order is open, so a continuing message may change it. */
export function cardOpen(state: ConversationState): boolean {
  return state.onScreen?.kind === "draft" || state.onScreen?.kind === "recurring";
}

/** After a save: the card is closed and nothing is pending. */
export function rememberSaved(state: ConversationState, savedItemId: string | null): ConversationState {
  return {
    ...state,
    onScreen: {
      kind: "saved",
      sourceText: state.onScreen?.sourceText ?? "",
      line: "the last card was saved.",
      ...(savedItemId ? { savedItemId } : {}),
    },
    pending: null,
  };
}

export interface ScreenFields {
  amount: number | null;
  currency: string | null;
  type: string | null;
  description: string;
  date: string | null;
}

/** A draft shown without a reader decision: a typed amount answer, or a receipt. */
export function rememberDraft(before: ConversationState, userText: string | null, fields: ScreenFields, label = "one transaction"): ConversationState {
  const text = userText ? clipText(userText) : "";
  const amount = fields.amount === null ? "no amount" : `${fields.amount} ${fields.currency ?? "ILS"}`;
  return {
    recentUserTexts: text ? [...before.recentUserTexts, text].slice(-REMEMBERED_TEXTS) : before.recentUserTexts.slice(),
    receiptText: null,
    onScreen: {
      kind: "draft",
      sourceText: userText ?? "",
      line: `${label}, not saved: ${fields.type ?? "type not set"} ${amount}, "${fields.description}", ${fields.date || "no date"}, one time.`,
    },
    pending: null,
  };
}

/** A turn that leaves nothing open, such as an unreadable receipt. */
export function rememberClosed(before: ConversationState): ConversationState {
  return { ...before, receiptText: null, onScreen: null, pending: null };
}

/** A data step keeps a draft the same turn opened, and takes the rest from its decision. */
export function rememberData(current: ConversationState, next: ConversationState): ConversationState {
  const open = current.onScreen;
  return open && (open.kind === "draft" || open.kind === "recurring") ? { ...next, onScreen: open } : next;
}

/** After an undo: nothing is open. */
export function rememberUndone(state: ConversationState): ConversationState {
  return { ...state, onScreen: null, pending: null };
}

export type TurnJev =
  | {
    ok: true;
    intent: IntakeIntent | null;
    confidence: number | null;
    halachaPage?: string | null;
    halachaPageConfidence?: number | null;
  }
  | { ok: false };

export type TurnPeriod = { kind: "all" } | { kind: "span"; from: string; to: string };

export type TurnQuestion = {
  slots: QuestionSlots;
  period: TurnPeriod | null;
  nameText: string | null;
} | null;

/** The reader's flags about the card on screen. */
type CardFlags = { continues?: boolean; discards?: boolean };

export type TurnReader =
  | { ok: false }
  | ({ ok: true; route: "list" } & CardFlags)
  | ({ ok: true; route: "unreadable" } & CardFlags)
  | ({
    ok: true;
    route: "several";
    items: AnchoredSplitItem[];
    dropped?: number;
    rule: { match: string; action: string | null } | null;
    question: ResolvedQuestion | null;
  } & CardFlags);

export type TurnNameCheck =
  | { category: string | null; description: string | null; recipient: string | null }
  | { missing: "category" | "recipient"; name: string; suggestions: string[] };

export interface TurnInput {
  message: string;
  jev: TurnJev;
  reader: TurnReader | null;
  question: TurnQuestion;
  questionAttempted: boolean;
  forcedIntent?: IntakeIntent | null;
  withData?: boolean;
  preferRabbi?: boolean;
  knownHalachaPage?: string | null;
  chosenFamily?: QuestionSlots["family"] | null;
  slotHold?: QuestionSlots | null;
  periodHold?: TurnPeriod | null;
  nameHold?: string | null;
  nameCheck?: TurnNameCheck | null;
  /** Already composed. Skips reading slots again, and only applies the name check. */
  settledQuestion?: YearTypeSum | null;
  /** The state before this turn. Every decision in one turn gets the same one. */
  state: ConversationState;
  /** The user's own words for memory, when `message` joins them to an earlier request. */
  userText?: string;
  today: string;
  calendar: "gregorian" | "hebrew";
}

export type TurnCard =
  | { type: "none" }
  | { type: "could_not_read" }
  | { type: "split_list" }
  | { type: "drafts"; dropped: number }
  | { type: "clarify"; field: "type" | "special" | "amount" }
  | { type: "draft"; checkAmount: boolean; checkDate: boolean }
  | { type: "recurring" }
  | { type: "frequency_unsupported" }
  | { type: "rule"; name: string; action: string }
  | { type: "discarded" }
  | { type: "already_saved" };

export type TurnData =
  | { status: "skip" }
  | { status: "loading" }
  | { status: "balance" }
  | { status: "standing_orders" }
  | { status: "period_missing" }
  | { status: "family_missing"; hold: QuestionSlots | null }
  | { status: "unsupported" }
  | { status: "rabbi" }
  | {
    status: "name_missing";
    topic: string;
    missing: "category" | "recipient";
    suggestions: string[];
    family: YearTypeSum["type"];
    question: YearTypeSum;
  }
  | { status: "ready"; question: YearTypeSum };

export interface TurnDecision {
  releaseAs: ShownIntent;
  mode: "ask" | "rabbi" | "show";
  intent: IntakeIntent | null;
  publishedPage: string | null;
  card: TurnCard;
  data: TurnData;
  side: "none" | "duplicates" | "inspiration";
  needsQuestion: boolean;
  needsNameCheck: boolean;
  pending: { kind: PendingKind; sourceText: string } | null;
  preferRabbi: boolean;
  /** The frequency notice, which can sit beside a rule card or a data answer. */
  frequencyBlocked: boolean;
  nextState: ConversationState;
}

export type TurnAnswerKind =
  | "draft"
  | "drafts"
  | "recurring"
  | "rule"
  | "data_answer"
  | "halacha"
  | "rabbi"
  | "inspiration"
  | "help"
  | "out_of_scope"
  | "question"
  | "could_not_read"
  | "frequency_unsupported"
  | "find_duplicates"
  | "discarded"
  | "already_saved"
  | "balance"
  | "standing_orders";

export interface TurnSummary {
  kind: TurnAnswerKind;
  amount: number | null;
  type: string | null;
  date: string | null;
  frequency: string | null;
  day: number | null;
  period: string | null;
  family: string | null;
  pending: PendingKind | null;
  /** A special type the card still asks about before saving. */
  typeAsked: string | null;
}

function severalOf(reader: TurnReader | null): Extract<TurnReader, { route: "several" }> | null {
  return reader && reader.ok && reader.route === "several" ? reader : null;
}

export function readerHasMovement(reader: TurnReader | null): boolean {
  if (!reader || !reader.ok) return false;
  if (reader.route === "list") return true;
  if (reader.route !== "several") return false;
  return reader.items.some((item) => item.amount !== null);
}

function readerQuestion(reader: TurnReader | null): ResolvedQuestion | null {
  return severalOf(reader)?.question ?? null;
}

function namedPage(jev: TurnJev): string | null {
  if (!jev.ok) return null;
  return namedHalachaPage(jev.halachaPage ?? null, jev.halachaPageConfidence ?? null);
}

interface Routed {
  releaseAs: ShownIntent;
  mode: "ask" | "rabbi" | "show";
  intent: IntakeIntent | null;
  withData: boolean;
  preferRabbi: boolean;
  publishedPage: string | null;
}

function route(input: TurnInput): Routed {
  if (input.forcedIntent) {
    const known = input.knownHalachaPage ?? null;
    const published = input.forcedIntent === "domain_adjacent" && known && known !== "personal" && known !== "none"
      ? known
      : null;
    return {
      releaseAs: input.forcedIntent,
      mode: "show",
      intent: input.forcedIntent,
      withData: input.withData === true || input.forcedIntent === "ask_data",
      preferRabbi: input.preferRabbi === true,
      publishedPage: published,
    };
  }
  const page = namedPage(input.jev);
  const movement = readerHasMovement(input.reader);
  const shown = input.jev.ok
    ? shownIntent(input.message, input.today, {
      ok: true,
      intent: input.jev.intent,
      confidence: input.jev.confidence,
      halachaPage: page ?? undefined,
    }, movement)
    : shownIntent(input.message, input.today, { ok: false }, movement);
  const dataCandidate = input.jev.ok && (input.jev.intent === "ask_data" || readerQuestion(input.reader) !== null);
  // An unsure Jev leaning to a standing order, with no recurrence read, asks rather than guessing a one-time draft.
  const leansRecurring = shown === "ask" && input.jev.ok && input.jev.intent === "create_recurring"
    && !severalOf(input.reader)?.items.some((item) => item.recurrence);
  if (movement && leansRecurring) {
    return { releaseAs: shown, mode: "ask", intent: null, withData: false, preferRabbi: false, publishedPage: null };
  }
  if (
    movement
    && (shown === "ask" || shown === "ask_data" || shown === "ask_rabbi" || shown === "add_transaction" || shown === "inspiration")
  ) {
    return {
      releaseAs: "add_transaction",
      mode: "show",
      intent: "add_transaction",
      withData: dataCandidate,
      preferRabbi: false,
      publishedPage: null,
    };
  }
  if (shown === "ask_rabbi" && dataCandidate) {
    return {
      releaseAs: "ask_data",
      mode: "show",
      intent: "ask_data",
      withData: true,
      preferRabbi: true,
      publishedPage: null,
    };
  }
  if (shown === "ask_rabbi") {
    return { releaseAs: shown, mode: "rabbi", intent: null, withData: false, preferRabbi: false, publishedPage: null };
  }
  if (shown === "ask") {
    return { releaseAs: shown, mode: "ask", intent: null, withData: false, preferRabbi: false, publishedPage: null };
  }
  const published = shown === "domain_adjacent" && page && page !== "personal" ? page : null;
  return {
    releaseAs: shown,
    mode: "show",
    intent: shown,
    withData: false,
    preferRabbi: false,
    publishedPage: published,
  };
}

function transactionCard(reader: TurnReader | null): TurnCard {
  if (!reader || !reader.ok || reader.route === "unreadable") return { type: "could_not_read" };
  if (reader.route === "list") return { type: "split_list" };
  if (reader.items.length > 1) return { type: "drafts", dropped: reader.dropped ?? 0 };
  const item = reader.items[0];
  if (!item) return { type: "could_not_read" };
  if (item.typeHint === "") return { type: "clarify", field: "type" };
  if (item.typeQuestion && !statedSpecialType(item)) return { type: "clarify", field: "special" };
  if (item.amount === null) return { type: "clarify", field: "amount" };
  return { type: "draft", checkAmount: item.checkAmount === true, checkDate: item.checkDate === true };
}

function frequencyBlocked(reader: TurnReader | null): boolean {
  return severalOf(reader)?.items.some((item) => item.unsupportedFrequency) === true;
}

function cardFor(intent: IntakeIntent | null, reader: TurnReader | null, chosen: boolean): TurnCard {
  const several = severalOf(reader);
  const rule = intent === "create_rule" ? several?.rule ?? null : null;
  if (rule) return { type: "rule", name: rule.match, action: rule.action ?? "ambiguous" };
  if (frequencyBlocked(reader)) return { type: "frequency_unsupported" };
  if (intent === "create_recurring") {
    if (several?.items[0]) return { type: "recurring" };
    return { type: "none" };
  }
  // A standing order the reader read is one, whatever Jev's label, but not when the user chose a transaction.
  // Several items stay drafts, as before.
  if (intent === "add_transaction" && !chosen && several?.items.length === 1 && several.items[0]?.recurrence) {
    return { type: "recurring" };
  }
  if (intent === "add_transaction") return transactionCard(reader);
  return { type: "none" };
}

function sideFor(intent: IntakeIntent | null): TurnDecision["side"] {
  if (intent === "find_duplicates") return "duplicates";
  if (intent === "inspiration") return "inspiration";
  return "none";
}

function slotsFor(input: TurnInput): QuestionSlots | null {
  if (!input.chosenFamily) return input.question?.slots ?? null;
  const base = input.slotHold ?? input.question?.slots ?? null;
  return {
    family: input.chosenFamily,
    measure: base?.measure ?? null,
    recipient: base?.recipient ?? null,
    category: base?.category ?? null,
    paymentMethod: base?.paymentMethod ?? null,
  };
}

function dataFor(input: TurnInput, wantsData: boolean, preferRabbi: boolean): { data: TurnData; needsQuestion: boolean; needsNameCheck: boolean } {
  if (!wantsData) return { data: { status: "skip" }, needsQuestion: false, needsNameCheck: false };
  if (input.settledQuestion) return readyOrName(input, input.settledQuestion);
  if (!input.questionAttempted) return { data: { status: "loading" }, needsQuestion: true, needsNameCheck: false };
  const movement = readerHasMovement(input.reader);
  const slots = slotsFor(input);
  // The balance and the standing orders are answered as they are, with no family or period.
  if (slots?.subject === "balance" || slots?.subject === "standing_orders") {
    return { data: { status: slots.subject }, needsQuestion: false, needsNameCheck: false };
  }
  const asked = slots && movement ? { ...slots, category: null, recipient: null } : slots;
  const period = input.question?.period ?? input.periodHold ?? null;
  const nameText = input.question?.nameText ?? input.nameHold ?? null;
  const composed = questionFromSlots(input.message, input.today, input.calendar, asked, period, nameText);
  if (composed === "ask_period") return { data: { status: "period_missing" }, needsQuestion: false, needsNameCheck: false };
  if (composed === "ask_family") {
    return { data: { status: "family_missing", hold: asked }, needsQuestion: false, needsNameCheck: false };
  }
  if (composed) return readyOrName(input, composed);
  const readQuestion = readerQuestion(input.reader);
  if (readQuestion) {
    const bare = movement ? { ...readQuestion, category: null, recipient: null } : readQuestion;
    const filled = input.chosenFamily && !bare.family ? { ...bare, family: input.chosenFamily } : bare;
    const built = yearSumFromReader(filled);
    if (built === "ask_family") return { data: { status: "family_missing", hold: null }, needsQuestion: false, needsNameCheck: false };
    if (built) return readyOrName(input, built);
  }
  if (preferRabbi) return { data: { status: "rabbi" }, needsQuestion: false, needsNameCheck: false };
  return { data: { status: "unsupported" }, needsQuestion: false, needsNameCheck: false };
}

function readyOrName(input: TurnInput, question: YearTypeSum): { data: TurnData; needsQuestion: boolean; needsNameCheck: boolean } {
  const check = input.nameCheck;
  if (check === undefined || check === null) {
    return { data: { status: "ready", question }, needsQuestion: false, needsNameCheck: true };
  }
  if ("missing" in check) {
    return {
      data: {
        status: "name_missing",
        topic: check.name,
        missing: check.missing,
        suggestions: check.suggestions,
        family: question.type,
        question,
      },
      needsQuestion: false,
      needsNameCheck: false,
    };
  }
  return { data: { status: "ready", question }, needsQuestion: false, needsNameCheck: false };
}

function pendingFor(message: string, card: TurnCard, data: TurnData): TurnDecision["pending"] {
  if (card.type === "clarify" && card.field === "amount") return { kind: "amount", sourceText: message };
  if (data.status === "period_missing") return { kind: "period", sourceText: message };
  if (data.status === "family_missing") return { kind: "family", sourceText: message };
  if (data.status === "name_missing") return { kind: "name", sourceText: message };
  return null;
}

function typeOf(item: AnchoredSplitItem): string {
  return statedSpecialType(item) ?? (item.typeHint || "type not set");
}

function itemLine(item: AnchoredSplitItem): string {
  const amount = item.amount === null ? "no amount" : `${item.amount} ${item.currency || "ILS"}`;
  return `${typeOf(item)} ${amount}, "${item.description}", ${item.date ?? "no date"}`;
}

/** The open card, from what this turn shows. Null when nothing stays open. */
function screenOf(message: string, decision: Omit<TurnDecision, "nextState">, reader: TurnReader | null): ConversationOnScreen | null {
  if (decision.mode !== "show") return null;
  const items = severalOf(reader)?.items ?? [];
  const first = items[0];
  const card = decision.card;
  if (card.type === "recurring" && first) {
    const recurrence = first.recurrence;
    const when = recurrence ? `${recurrence.frequency}${recurrence.dayOfMonth ? ` on day ${recurrence.dayOfMonth}` : ""}` : "frequency not set";
    return { kind: "recurring", sourceText: message, line: `a standing order, not saved: ${itemLine(first)}, ${when}.` };
  }
  if ((card.type === "draft" || card.type === "clarify") && first) {
    return { kind: "draft", sourceText: message, line: `one transaction, not saved: ${itemLine(first)}, one time.` };
  }
  if (card.type === "drafts" && first) {
    return { kind: "draft", sourceText: message, line: `${items.length} transactions, not saved, first: ${itemLine(first)}.` };
  }
  if (decision.data.status === "ready") {
    const question = decision.data.question;
    return { kind: "data_answer", sourceText: message, line: `an answer about ${question.type} from ${question.from} to ${question.to}.` };
  }
  if (decision.data.status === "balance") return { kind: "data_answer", sourceText: message, line: "the user's tithe balance." };
  if (decision.data.status === "standing_orders") return { kind: "data_answer", sourceText: message, line: "the list of the user's standing orders." };
  if (decision.publishedPage) return { kind: "halacha", sourceText: message, line: "a published halacha page." };
  if (decision.side === "inspiration") return { kind: "inspiration", sourceText: message, line: "an inspiration item from the library." };
  return null;
}

function clipText(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= MAX_REMEMBERED_TEXT ? flat : flat.slice(0, MAX_REMEMBERED_TEXT);
}

/**
 * The state after this turn. It always starts from the state before the turn, so the
 * second decision of one turn (after the data read) replaces the first without adding the message twice.
 */
function rememberTurn(before: ConversationState, userText: string, decision: Omit<TurnDecision, "nextState">, reader: TurnReader | null): ConversationState {
  const text = clipText(userText);
  return {
    recentUserTexts: text ? [...before.recentUserTexts, text].slice(-REMEMBERED_TEXTS) : before.recentUserTexts.slice(),
    receiptText: null,
    onScreen: screenOf(userText, decision, reader),
    pending: decision.pending,
  };
}

function readerSays(reader: TurnReader | null, flag: "continues" | "discards"): boolean {
  return Boolean(reader && reader.ok && reader[flag] === true);
}

/** A message about the card on screen: drop it, or a change to one that was already saved. */
function cardTurn(input: TurnInput): TurnDecision | null {
  if (input.forcedIntent) return null;
  const open = input.state.onScreen;
  const card: TurnCard | null = readerSays(input.reader, "discards") && (open?.kind === "draft" || open?.kind === "recurring")
    ? { type: "discarded" }
    : readerSays(input.reader, "continues") && open?.kind === "saved"
      ? { type: "already_saved" }
      : null;
  if (!card) return null;
  const decision: Omit<TurnDecision, "nextState"> = {
    releaseAs: "add_transaction",
    mode: "show",
    intent: null,
    publishedPage: null,
    card,
    data: { status: "skip" },
    side: "none",
    needsQuestion: false,
    needsNameCheck: false,
    pending: null,
    preferRabbi: false,
    frequencyBlocked: false,
  };
  const next = rememberTurn(input.state, input.userText ?? input.message, decision, input.reader);
  return { ...decision, nextState: card.type === "already_saved" ? { ...next, onScreen: open } : next };
}

/** What this turn shows, and the pending question, from the model results. The drawer only applies it. */
export function decideTurn(input: TurnInput): TurnDecision {
  const aboutCard = cardTurn(input);
  if (aboutCard) return aboutCard;
  const routed = route(input);
  const card = routed.mode === "show" ? cardFor(routed.intent, input.reader, Boolean(input.forcedIntent)) : { type: "none" as const };
  const intent = card.type === "recurring" ? "create_recurring" : routed.intent;
  const wantsData = routed.intent === "ask_data" || (routed.withData && routed.intent === "add_transaction");
  const data = routed.mode === "show"
    ? dataFor(input, wantsData, routed.preferRabbi)
    : { data: { status: "skip" as const }, needsQuestion: false, needsNameCheck: false };
  const decision: Omit<TurnDecision, "nextState"> = {
    releaseAs: card.type === "recurring" ? "create_recurring" : routed.releaseAs,
    mode: routed.mode,
    intent,
    publishedPage: routed.publishedPage,
    card,
    data: data.data,
    side: routed.mode === "show" ? sideFor(intent) : "none",
    needsQuestion: data.needsQuestion,
    needsNameCheck: data.needsNameCheck,
    pending: pendingFor(input.message, card, data.data),
    preferRabbi: routed.preferRabbi,
    frequencyBlocked: routed.mode === "show" && frequencyBlocked(input.reader),
  };
  return { ...decision, nextState: rememberTurn(input.state, input.userText ?? input.message, decision, input.reader) };
}

function firstItem(reader: TurnReader | null): AnchoredSplitItem | null {
  const several = severalOf(reader);
  return several?.items[0] ?? null;
}

/** Fields the conversation eval compares. Numbers come from the reader item, not from a second parse. */
export function summarizeTurn(input: TurnInput, decision: TurnDecision): TurnSummary {
  const item = firstItem(input.reader);
  const question = decision.data.status === "ready" || decision.data.status === "name_missing" ? decision.data.question : null;
  const kind = summaryKind(decision);
  return {
    kind,
    amount: item?.amount ?? null,
    type: (item ? statedSpecialType(item) : null) ?? (item?.typeHint ? item.typeHint : question?.type ?? null),
    date: item?.date ?? null,
    frequency: item?.recurrence?.frequency ?? null,
    day: item?.recurrence?.dayOfMonth ?? null,
    period: question ? `${question.from}..${question.to}` : null,
    family: question?.type ?? null,
    pending: decision.pending?.kind ?? null,
    typeAsked: item && item.typeQuestion && !statedSpecialType(item) ? item.typeQuestion : null,
  };
}

function summaryKind(decision: TurnDecision): TurnAnswerKind {
  if (decision.mode === "ask") return "question";
  if (decision.mode === "rabbi" || decision.data.status === "rabbi") return "rabbi";
  if (decision.card.type === "could_not_read") return "could_not_read";
  if (decision.card.type === "frequency_unsupported" && decision.data.status !== "ready") return "frequency_unsupported";
  if (decision.card.type === "split_list" || decision.card.type === "drafts") return "drafts";
  if (decision.card.type === "clarify") return "question";
  if (decision.card.type === "draft") return "draft";
  if (decision.card.type === "recurring") return "recurring";
  if (decision.card.type === "rule") return "rule";
  if (decision.card.type === "discarded") return "discarded";
  if (decision.card.type === "already_saved") return "already_saved";
  if (decision.data.status === "period_missing" || decision.data.status === "family_missing" || decision.data.status === "name_missing") {
    return "question";
  }
  if (decision.data.status === "ready") return "data_answer";
  if (decision.data.status === "balance") return "balance";
  if (decision.data.status === "standing_orders") return "standing_orders";
  if (decision.data.status === "unsupported") return "out_of_scope";
  if (decision.intent === "domain_adjacent" && decision.publishedPage) return "halacha";
  if (decision.intent === "inspiration" || decision.side === "inspiration") return "inspiration";
  if (decision.intent === "help") return "help";
  if (decision.intent === "find_duplicates") return "find_duplicates";
  if (decision.intent === "out_of_scope" || decision.intent === "domain_adjacent") return "out_of_scope";
  return "out_of_scope";
}
