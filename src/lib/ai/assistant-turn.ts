import type { IntakeIntent } from "../../../supabase/functions/_shared/ai/intent.ts";
import { questionFromSlots, type YearTypeSum } from "../../../supabase/functions/_shared/ai/data-question.ts";
import type { QuestionSlots } from "../../../supabase/functions/_shared/ai/question-slots.ts";
import { statedSpecialType, type AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import type { ResolvedQuestion } from "../../../supabase/functions/_shared/ai/split-response.ts";
import { namedHalachaPage, shownIntent, type ShownIntent } from "../../components/ai-intake/assistant-shown-intent.ts";
import { yearSumFromReader } from "./reader-question.ts";
import { conversationContext } from "../../../supabase/functions/_shared/ai/conversation-context.ts";
import { intentIsConfident } from "../../../supabase/functions/_shared/ai/jev-intent.ts";

export type PendingKind = "amount" | "period" | "family" | "name" | "rule";

export interface ConversationOnScreen {
  kind: "draft" | "recurring" | "data_answer" | "halacha" | "inspiration" | "saved" | "rule";
  sourceText: string;
  /** What the code tells the models about this card. Never the assistant's own wording. */
  line: string;
  /** The open card's amounts as the card shows them, including the user's own edits. */
  amounts?: number[];
  /** The single card's date as shown, to notice when the user changes it. */
  date?: string | null;
  savedItemId?: string;
  /** The saved transaction's fields, to tell the same transaction again from a correction. */
  saved?: ScreenFields;
  /** The period a data answer covered, for a follow-up that names none. */
  period?: { from: string; to: string };
  /** The published page shown, for a follow-up such as "give an example". */
  page?: string;
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

/**
 * What may back an amount or a date that a continuing message keeps: the words that opened the
 * card and the amounts it shows. Not the earlier messages, which may hold saved or dropped cards,
 * and not the line, whose numbers the code wrote. "" when no draft or standing order is open.
 */
export function openCardEvidence(state: ConversationState): string {
  const open = state.onScreen;
  // A single saved transaction can still be corrected, so its words back a correction too.
  const correctable = open?.kind === "saved" && Boolean(open.savedItemId);
  if (!open || (open.kind !== "draft" && open.kind !== "recurring" && !correctable)) return "";
  return [open.sourceText, (open.amounts ?? []).join(" ")].filter(Boolean).join("\n");
}

/**
 * After a save: nothing is pending. A single saved transaction keeps its fields, so a correction
 * such as "it was a donation" can be read against it. Its words back an amount only while the
 * saved amount and date are the ones they opened.
 */
export function rememberSaved(state: ConversationState, savedItemId: string | null, saved: ScreenFields | null = null): ConversationState {
  const open = state.onScreen;
  const amounts = saved ? amountsOf([saved]) : [];
  const same = saved !== null && amounts.join(" ") === (open?.amounts ?? []).join(" ") && saved.date === (open?.date ?? null);
  return {
    ...state,
    onScreen: {
      kind: "saved",
      sourceText: saved && !same ? "" : open?.sourceText ?? "",
      line: saved ? `one transaction, saved and still open to a correction: ${fieldsLine(saved)}, one time.` : "the last card was saved.",
      ...(saved ? { amounts, date: saved.date, saved } : {}),
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
  category?: string | null;
  paymentMethod?: string | null;
  isChomesh?: boolean | null;
}

function fieldsLine(fields: ScreenFields): string {
  const amount = fields.amount === null ? "no amount" : `${fields.amount} ${fields.currency || "ILS"}`;
  return `${fields.type ?? "type not set"} ${amount}, "${fields.description}", ${fields.date || "no date"}`;
}

function whenLine(frequency: string | null, dayOfMonth: number | null): string {
  return frequency ? `${frequency}${dayOfMonth ? ` on day ${dayOfMonth}` : ""}` : "frequency not set";
}

/** A draft shown without a reader decision: a typed amount answer, or a receipt. */
export function rememberDraft(before: ConversationState, userText: string | null, fields: ScreenFields, label = "one transaction"): ConversationState {
  const text = userText ? clipText(userText) : "";
  return {
    recentUserTexts: text ? [...before.recentUserTexts, text].slice(-REMEMBERED_TEXTS) : before.recentUserTexts.slice(),
    receiptText: null,
    onScreen: {
      kind: "draft",
      sourceText: userText ?? "",
      line: `${label}, not saved: ${fieldsLine(fields)}, one time.`,
      amounts: amountsOf([fields]),
      date: fields.date,
    },
    pending: null,
  };
}

function amountsOf(items: readonly { amount: number | null }[]): number[] {
  return items.flatMap((item) => item.amount === null ? [] : [item.amount]);
}

export interface LiveCards {
  draft: ScreenFields | null;
  recurring: (ScreenFields & { frequency: string | null; dayOfMonth: number | null }) | null;
  /** The card on screen was saved, even if the save returned after a newer request started. */
  saved: { itemId: string | null } | null;
}

/** Once the user changes the card's amount or date, the words that opened it no longer back either. */
function redrawn(open: ConversationOnScreen, line: string, fields: ScreenFields): ConversationOnScreen {
  const amounts = amountsOf([fields]);
  const same = amounts.join(" ") === (open.amounts ?? []).join(" ") && fields.date === (open.date ?? null);
  return { ...open, line, amounts, date: fields.date, sourceText: same ? open.sourceText : "" };
}

/** The open card as it is now: saved, or redrawn with the user's own edits. */
export function withLiveCard(state: ConversationState, live: LiveCards): ConversationState {
  const open = state.onScreen;
  if (!open || (open.kind !== "draft" && open.kind !== "recurring")) return state;
  if (live.saved) return rememberSaved(state, live.saved.itemId, live.saved.itemId ? live.draft : null);
  if (open.kind === "recurring" && live.recurring) {
    const line = `a standing order, not saved: ${fieldsLine(live.recurring)}, ${whenLine(live.recurring.frequency, live.recurring.dayOfMonth)}.`;
    return { ...state, onScreen: redrawn(open, line, live.recurring) };
  }
  // A list keeps its line; only a single draft is redrawn, with the label it was shown with.
  if (open.kind === "draft" && live.draft && open.line.startsWith("one ")) {
    const label = open.line.slice(0, open.line.indexOf(","));
    return { ...state, onScreen: redrawn(open, `${label}, not saved: ${fieldsLine(live.draft)}, one time.`, live.draft) };
  }
  return state;
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
  /** The saved intake item this card corrects. Saving it undoes that one first. */
  replaces: string | null;
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
  category: string | null;
  description: string | null;
  chomesh: boolean | null;
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

/** The saved single transaction a continuing message corrects, with the full corrected item read. */
function correctedSaved(input: TurnInput): string | null {
  const open = input.state.onScreen;
  if (input.forcedIntent || open?.kind !== "saved" || !open.savedItemId || !readerSays(input.reader, "continues")) return null;
  const items = severalOf(input.reader)?.items ?? [];
  if (repeatsSaved(input)) return null;
  return items.length === 1 && items[0]?.amount !== null && !items[0]?.recurrence ? open.savedItemId : null;
}

function sameText(a: string, b: string): boolean {
  const flat = (text: string) => text.replace(/\s+/g, " ").trim().toLowerCase();
  return flat(a) === flat(b);
}

/**
 * The one item read is the saved transaction again: the same message, or a rephrasing, whatever
 * the reader's continue flag says. A field the item leaves empty keeps the saved value.
 * ponytail: a second identical transaction (same amount, description and date) right after the
 * first is taken for a repeat too; the form still adds it. A "new" flag from the reader if that bites.
 */
function repeatsSaved(input: TurnInput): boolean {
  const open = input.state.onScreen;
  const saved = open?.kind === "saved" ? open.saved : undefined;
  const items = severalOf(input.reader)?.items ?? [];
  const item = items[0];
  if (!saved || items.length !== 1 || !item || item.recurrence || item.amount === null) return false;
  const keeps = <T>(read: T | null | undefined, kept: T | null | undefined) => read === null || read === undefined || read === kept;
  // A special type the card would ask about again was already answered on the saved one.
  const types: (string | null)[] = [statedSpecialType(item) ?? item.typeHint, item.typeQuestion];
  return item.amount === saved.amount
    && (item.currency === "" || item.currency === saved.currency)
    && (item.typeHint === "" || types.includes(saved.type))
    && keeps(item.date, saved.date)
    && sameText(item.description, saved.description)
    && keeps(item.category, saved.category)
    && keeps<string>(item.paymentMethod, saved.paymentMethod)
    && keeps(item.chomesh, saved.isChomesh);
}

function namedPage(jev: TurnJev, state: ConversationState): string | null {
  if (!jev.ok) return null;
  const named = namedHalachaPage(jev.halachaPage ?? null, jev.halachaPageConfidence ?? null);
  if (named) return named;
  const sure = jev.intent === "domain_adjacent" && intentIsConfident(jev.confidence);
  if (!sure) return null;
  // Jev is sure a published page answers this, only not which one: its best page, or the page
  // already on screen for a follow-up such as "give an example", beats "I can't".
  const best = jev.halachaPage ?? null;
  if (best && best !== "none" && best !== "personal") return best;
  return state.onScreen?.kind === "halacha" ? state.onScreen.page ?? null : null;
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
  const page = namedPage(input.jev, input.state);
  const movement = readerHasMovement(input.reader);
  const shown = input.jev.ok
    ? shownIntent({
      ok: true,
      intent: input.jev.intent,
      confidence: input.jev.confidence,
      halachaPage: page ?? undefined,
    }, movement)
    : shownIntent({ ok: false }, movement);
  const dataCandidate = input.jev.ok && (input.jev.intent === "ask_data" || readerQuestion(input.reader) !== null);
  // An unsure Jev leaning to a standing order, with no recurrence read, asks rather than guessing a one-time draft.
  const leansRecurring = shown === "ask" && input.jev.ok && input.jev.intent === "create_recurring"
    && !severalOf(input.reader)?.items.some((item) => item.recurrence);
  if (movement && leansRecurring) {
    return { releaseAs: shown, mode: "ask", intent: null, withData: false, preferRabbi: false, publishedPage: null };
  }
  const isContinuingCard = (readerSays(input.reader, "continues")
    && (input.state.onScreen?.kind === "draft" || input.state.onScreen?.kind === "recurring"))
    || correctedSaved(input) !== null;
  if (movement && isContinuingCard) {
    const continuingIntent: IntakeIntent = input.state.onScreen?.kind === "recurring" ? "create_recurring" : "add_transaction";
    return {
      releaseAs: continuingIntent,
      mode: "show",
      intent: continuingIntent,
      withData: dataCandidate,
      preferRabbi: false,
      publishedPage: null,
    };
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
  // A rule the reader read answers an open rule request, or an unsure Jev.
  if (!movement && severalOf(input.reader)?.rule && (shown === "ask" || input.state.onScreen?.kind === "rule")) {
    return { releaseAs: "create_rule", mode: "show", intent: "create_rule", withData: false, preferRabbi: false, publishedPage: null };
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
  const answered = input.state.onScreen?.kind === "data_answer" ? input.state.onScreen.period ?? null : null;
  // "To which places?" after an answer about this month asks about the same month.
  const period = input.question?.period ?? input.periodHold ?? (answered ? { kind: "span" as const, ...answered } : null);
  const nameText = input.question?.nameText ?? input.nameHold ?? null;
  const composed = questionFromSlots(input.message, input.today, input.calendar, asked, period, nameText);
  // A personal halacha question that also reads as a data question gets the rabbi card, not "for which period?".
  if (preferRabbi && composed === "ask_period") {
    return { data: { status: "rabbi" }, needsQuestion: false, needsNameCheck: false };
  }
  if (composed === "ask_period") return { data: { status: "period_missing" }, needsQuestion: false, needsNameCheck: false };
  if (composed === "ask_family") {
    return { data: { status: "family_missing", hold: asked }, needsQuestion: false, needsNameCheck: false };
  }
  if (composed) return readyOrName(input, composed);
  const readQuestion = readerQuestion(input.reader);
  if (readQuestion) {
    const bare = movement ? { ...readQuestion, category: null, recipient: null } : readQuestion;
    const filled = input.chosenFamily && !bare.family ? { ...bare, family: input.chosenFamily } : bare;
    const built = yearSumFromReader(filled, input.today, input.calendar);
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

function pendingFor(message: string, intent: IntakeIntent | null, card: TurnCard, data: TurnData): TurnDecision["pending"] {
  if (card.type === "clarify" && card.field === "amount") return { kind: "amount", sourceText: message };
  if (intent === "create_rule" && card.type === "none") return { kind: "rule", sourceText: message };
  if (data.status === "period_missing") return { kind: "period", sourceText: message };
  if (data.status === "family_missing") return { kind: "family", sourceText: message };
  if (data.status === "name_missing") return { kind: "name", sourceText: message };
  return null;
}

function typeOf(item: AnchoredSplitItem): string {
  return statedSpecialType(item) ?? (item.typeHint || "type not set");
}

function itemLine(item: AnchoredSplitItem): string {
  return fieldsLine({ ...item, type: typeOf(item) });
}

/** The open card, from what this turn shows. Null when nothing stays open. */
function screenOf(message: string, decision: Omit<TurnDecision, "nextState">, reader: TurnReader | null): ConversationOnScreen | null {
  if (decision.mode !== "show") return null;
  const items = severalOf(reader)?.items ?? [];
  const first = items[0];
  const card = decision.card;
  if (card.type === "recurring" && first) {
    const when = whenLine(first.recurrence?.frequency ?? null, first.recurrence?.dayOfMonth ?? null);
    return { kind: "recurring", sourceText: message, line: `a standing order, not saved: ${itemLine(first)}, ${when}.`, amounts: amountsOf([first]), date: first.date };
  }
  if ((card.type === "draft" || card.type === "clarify") && first) {
    return { kind: "draft", sourceText: message, line: `one transaction, not saved: ${itemLine(first)}, one time.`, amounts: amountsOf([first]), date: first.date };
  }
  if (card.type === "drafts" && first) {
    return { kind: "draft", sourceText: message, line: `${items.length} transactions, not saved, first: ${itemLine(first)}.`, amounts: amountsOf(items) };
  }
  if (card.type === "rule") {
    return { kind: "rule", sourceText: message, line: `a rule, not saved: "${card.name}" as ${card.action === "ambiguous" ? "type not set" : card.action}.` };
  }
  if (decision.intent === "create_rule") {
    return { kind: "rule", sourceText: message, line: "a rule request, not saved: no name or type yet." };
  }
  if (decision.data.status === "ready") {
    const question = decision.data.question;
    return {
      kind: "data_answer",
      sourceText: message,
      line: `an answer about ${question.type} from ${question.from} to ${question.to}.`,
      period: { from: question.from, to: question.to },
    };
  }
  if (decision.data.status === "balance") return { kind: "data_answer", sourceText: message, line: "the user's tithe balance." };
  if (decision.data.status === "standing_orders") return { kind: "data_answer", sourceText: message, line: "the list of the user's standing orders." };
  if (decision.publishedPage) {
    return { kind: "halacha", sourceText: message, line: `a published halacha page about ${decision.publishedPage}.`, page: decision.publishedPage };
  }
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
  // "Drop it, I gave 50 to Ezer Mizion" brings a new card, so it is routed like any message.
  const onlyDrops = !readerHasMovement(input.reader) && !severalOf(input.reader)?.items.length;
  const card: TurnCard | null = readerSays(input.reader, "discards") && onlyDrops && (open?.kind === "draft" || open?.kind === "recurring")
    ? { type: "discarded" }
    : open?.kind === "saved" && (repeatsSaved(input) || (readerSays(input.reader, "continues") && !correctedSaved(input)))
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
    replaces: null,
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
    pending: pendingFor(input.message, intent, card, data.data),
    preferRabbi: routed.preferRabbi,
    frequencyBlocked: routed.mode === "show" && frequencyBlocked(input.reader),
    replaces: card.type === "draft" || card.type === "clarify" ? correctedSaved(input) : null,
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
    category: item?.category ?? null,
    description: item?.description ?? null,
    chomesh: item?.chomesh ?? null,
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
  if (decision.intent === "create_rule") return "question";
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
