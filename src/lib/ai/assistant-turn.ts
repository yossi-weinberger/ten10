import type { IntakeIntent } from "../../../supabase/functions/_shared/ai/intent.ts";
import { questionFromSlots, type YearTypeSum } from "../../../supabase/functions/_shared/ai/data-question.ts";
import type { QuestionSlots } from "../../../supabase/functions/_shared/ai/question-slots.ts";
import type { AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import type { ResolvedQuestion } from "../../../supabase/functions/_shared/ai/split-response.ts";
import { namedHalachaPage, shownIntent, type ShownIntent } from "../../components/ai-intake/assistant-shown-intent.ts";
import { yearSumFromReader } from "./reader-question.ts";

export type PendingKind = "amount" | "period" | "family" | "name";

export type ConversationOnScreen =
  | { kind: "draft"; sourceText: string }
  | { kind: "recurring"; sourceText: string }
  | { kind: "data_answer"; sourceText: string }
  | { kind: "halacha"; sourceText: string }
  | { kind: "inspiration"; sourceText: string }
  | { kind: "saved"; sourceText: string; savedItemId: string };

export interface ConversationState {
  recentUserTexts: string[];
  receiptText: string | null;
  onScreen: ConversationOnScreen | null;
  pending: { kind: PendingKind; sourceText: string } | null;
}

export function emptyConversation(): ConversationState {
  return { recentUserTexts: [], receiptText: null, onScreen: null, pending: null };
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

export type TurnReader =
  | { ok: false }
  | { ok: true; route: "list" }
  | { ok: true; route: "unreadable" }
  | {
    ok: true;
    route: "several";
    items: AnchoredSplitItem[];
    dropped?: number;
    rule: { match: string; action: string | null } | null;
    question: ResolvedQuestion | null;
  };

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
  state: ConversationState;
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
  | { type: "rule"; name: string; action: string };

export type TurnData =
  | { status: "skip" }
  | { status: "loading" }
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
  | "find_duplicates";

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
  if (item.typeQuestion) return { type: "clarify", field: "special" };
  if (item.amount === null) return { type: "clarify", field: "amount" };
  return { type: "draft", checkAmount: item.checkAmount === true, checkDate: item.checkDate === true };
}

function cardFor(intent: IntakeIntent | null, reader: TurnReader | null): TurnCard {
  const several = severalOf(reader);
  if (several?.items.some((item) => item.unsupportedFrequency) === true) return { type: "frequency_unsupported" };
  if (intent === "create_recurring") {
    if (several?.items[0]) return { type: "recurring" };
    return { type: "none" };
  }
  if (intent === "create_rule") {
    const rule = severalOf(reader)?.rule ?? null;
    if (!rule) return { type: "none" };
    return { type: "rule", name: rule.match, action: rule.action ?? "ambiguous" };
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

function copyState(state: ConversationState): ConversationState {
  return {
    recentUserTexts: state.recentUserTexts.slice(),
    receiptText: state.receiptText,
    onScreen: state.onScreen,
    pending: state.pending,
  };
}

/** What this turn shows, and the pending question, from the model results. The drawer only applies it. */
export function decideTurn(input: TurnInput): TurnDecision {
  const routed = route(input);
  const wantsData = routed.intent === "ask_data" || (routed.withData && routed.intent === "add_transaction");
  const card = routed.mode === "show" ? cardFor(routed.intent, input.reader) : { type: "none" as const };
  const data = routed.mode === "show"
    ? dataFor(input, wantsData, routed.preferRabbi)
    : { data: { status: "skip" as const }, needsQuestion: false, needsNameCheck: false };
  return {
    releaseAs: routed.releaseAs,
    mode: routed.mode,
    intent: routed.intent,
    publishedPage: routed.publishedPage,
    card,
    data: data.data,
    side: routed.mode === "show" ? sideFor(routed.intent) : "none",
    needsQuestion: data.needsQuestion,
    needsNameCheck: data.needsNameCheck,
    pending: pendingFor(input.message, card, data.data),
    preferRabbi: routed.preferRabbi,
    nextState: copyState(input.state),
  };
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
    type: item?.typeHint ? item.typeHint : question?.type ?? null,
    date: item?.date ?? null,
    frequency: item?.recurrence?.frequency ?? null,
    day: item?.recurrence?.dayOfMonth ?? null,
    period: question ? `${question.from}..${question.to}` : null,
    family: question?.type ?? null,
    pending: decision.pending?.kind ?? null,
  };
}

function summaryKind(decision: TurnDecision): TurnAnswerKind {
  if (decision.mode === "ask") return "question";
  if (decision.mode === "rabbi" || decision.data.status === "rabbi") return "rabbi";
  if (decision.card.type === "could_not_read") return "could_not_read";
  if (decision.card.type === "frequency_unsupported") return "frequency_unsupported";
  if (decision.card.type === "split_list" || decision.card.type === "drafts") return "drafts";
  if (decision.card.type === "clarify") return "question";
  if (decision.card.type === "draft") return "draft";
  if (decision.card.type === "recurring") return "recurring";
  if (decision.card.type === "rule") return "rule";
  if (decision.data.status === "period_missing" || decision.data.status === "family_missing" || decision.data.status === "name_missing") {
    return "question";
  }
  if (decision.data.status === "ready") return "data_answer";
  if (decision.data.status === "unsupported") return "out_of_scope";
  if (decision.intent === "domain_adjacent" && decision.publishedPage) return "halacha";
  if (decision.intent === "inspiration" || decision.side === "inspiration") return "inspiration";
  if (decision.intent === "help") return "help";
  if (decision.intent === "find_duplicates") return "find_duplicates";
  if (decision.intent === "out_of_scope" || decision.intent === "domain_adjacent") return "out_of_scope";
  return "out_of_scope";
}
