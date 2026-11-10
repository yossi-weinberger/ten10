import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlatform } from "@/contexts/PlatformContext";
import { useDonationStore } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import {
  type ClarificationField,
  type IntakeIntent,
  type ParsedUserRule,
  type RuleActionType,
  type TextTransactionDraft,
  type QuestionSlots,
  type YearTypeSum,
} from "@/lib/ai/classify-intake";
import { nextDraftIdempotency, type DraftIdempotency } from "@/lib/ai/save-text-draft";
import {
  listDuplicateCandidates,
  type DuplicateCandidate,
} from "@/lib/ai/duplicate-candidates";
import { orderCandidatesByRank } from "@/lib/ai/duplicate-rank";
import { rankDuplicateCandidates } from "@/lib/ai/rank-duplicates";
import { type InspirationView } from "@/lib/ai/inspiration-pick";
import type { ReceiptFields } from "@/lib/ai/receipt-card";
import {
  QUESTION_OUTCOME_WINDOW_MS,
  markQuestionOutcome,
  nextQuestionOutcome,
  type MeasurementHold,
  type QuestionOutcomeEvent,
} from "@/lib/ai/question-outcome";
import type { RecurringCard } from "@/lib/ai/recurring-card";
import type { SplitItemsResult } from "@/lib/ai/split-items";
import {
  contextFor,
  emptyConversation,
  withLiveCard,
} from "@/lib/ai/assistant-turn";
import type { HeldDraft } from "@/lib/ai/split-draft";
import type { SplitDraft } from "@/lib/ai/split-cards";
import { parseDraftAmount } from "@/lib/ai/draft-amount";
import type { RecurringTransaction } from "@/types/transaction";
import {
  buildReplyBlocks,
  emptyReplyState,
  nextConversation,
  type AssistantTurn,
  type DataReply,
  type DuplicateScanState,
  type ReplyState,
  type StatusKey,
  type UserTurn,
} from "./assistant-reply-view";
import { buildDrawerReplyState, draftReplyView, type OriginalDraft } from "./assistant-drawer-state";

export function useAssistantDrawerState() {
  const { platform } = usePlatform();
  const { user } = useAuth();
  const { t, i18n } = useTranslation([
    "navigation",
    "transactions",
    "halacha-expenses",
    "halacha-income",
    "halacha-chomesh",
    "halacha-tithes",
  ]);
  const calendarType = useDonationStore((state) => state.settings.calendarType);
  const storedCurrency = useDonationStore((state) => state.settings.defaultCurrency);
  const autoCalcChomesh = useDonationStore((state) => state.settings.autoCalcChomesh);
  // The profile currency as is. A message without a currency word is in this currency.
  const defaultCurrency = storedCurrency;
  const questionCalendar: "hebrew" | "gregorian" = calendarType === "hebrew" ? "hebrew" : "gregorian";
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<IntakeIntent | null>(null);
  const [inspiration, setInspiration] = useState<InspirationView | null>(null);
  const [draft, setDraft] = useState<TextTransactionDraft | null>(null);
  const [recurring, setRecurring] = useState<RecurringCard | null>(null);
  const idempotency = useRef<DraftIdempotency | null>(null);
  const splitKey = useRef<string | null>(null);
  /** Bumped after each list save or undo, so the next save of the same rows gets a new key. */
  const splitAttempt = useRef(0);
  /** The list rows a duplicate warning was shown for. Saving the same rows again saves anyway. */
  const splitDuplicateWarned = useRef<string | null>(null);
  const originalDraft = useRef<OriginalDraft | null>(null);
  const savedRecurring = useRef<RecurringTransaction | null>(null);
  /** The row id a standing-order save sends, kept while the definition is unchanged. */
  const recurringSaveId = useRef<{ signature: string; id: string } | null>(null);
  /** A duplicate-pair delete or dismiss in flight. */
  const pairActionBusy = useRef(false);
  /** The last single transaction saved from a card, which a correction may replace. */
  const savedTransaction = useRef<{ itemId: string; transactionId: string } | null>(null);
  /** The saved transaction the open card corrects. Saving undoes it first. */
  const replacing = useRef<{ itemId: string; transactionId: string } | null>(null);
  const previewUrls = useRef<string[]>([]);
  const [receiptArtifactId, setReceiptArtifactId] = useState<string | null>(null);
  const [receiptLink, setReceiptLink] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [duplicatesRanked, setDuplicatesRanked] = useState(false);
  /** A duplicate check still running. Save waits, or the warning could be skipped. */
  const [duplicatesPending, setDuplicatesPending] = useState(false);
  const [clarification, setClarification] = useState<ClarificationField | null>(null);
  const [specialType, setSpecialType] = useState<HeldDraft["typeQuestion"]>(null);
  const held = useRef<HeldDraft | null>(null);
  const splitRef = useRef<SplitItemsResult | null>(null);
  const halachaRef = useRef<string | null>(null);
  const preferRabbi = useRef(false);
  const [pendingText, setPendingText] = useState("");
  const [receiptFields, setReceiptFields] = useState<ReceiptFields | null>(null);
  const [parsedRule, setParsedRule] = useState<ParsedUserRule | null>(null);
  const [ruleChoice, setRuleChoice] = useState<RuleActionType | null>(null);
  const [appliedRuleName, setAppliedRuleName] = useState<string | null>(null);
  const [halachaNamespace, setHalachaNamespace] = useState<string | null>(null);
  const [halachaUserQuestion, setHalachaUserQuestion] = useState<string | null>(null);
  const [rabbiText, setRabbiText] = useState<string | null>(null);
  const [rabbiTicket, setRabbiTicket] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<"reading" | "receipt" | "voice" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusKey | null>(null);
  const [splitDrafts, setSplitDrafts] = useState<SplitDraft[] | null>(null);
  const [splitDropped, setSplitDropped] = useState(0);
  const [askIntent, setAskIntent] = useState(false);
  const [intentConfidence, setIntentConfidence] = useState<number | null>(null);
  const [dataReply, setDataReply] = useState<DataReply | null>(null);
  const [slotHold, setSlotHold] = useState<QuestionSlots | null>(null);
  const periodHold = useRef<{ kind: "all" } | { kind: "span"; from: string; to: string } | null>(null);
  const nameHold = useRef<string | null>(null);
  const [askedQuestion, setAskedQuestion] = useState<YearTypeSum | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [duplicateActionFailed, setDuplicateActionFailed] = useState(false);
  const [duplicateScan, setDuplicateScan] = useState<DuplicateScanState | null>(null);

  const [history, setHistory] = useState<AssistantTurn[]>([]);
  const [activeUser, setActiveUser] = useState<UserTurn | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const requestRef = useRef(0);
  /** What the chat remembers after the last turn. */
  const memoryRef = useRef(emptyConversation());
  /** The memory before the current turn. Every decision in one turn starts from it. */
  const turnStart = useRef(emptyConversation());
  /** The block sent to the models with the current turn. */
  const contextRef = useRef("");
  const measurement = useRef<MeasurementHold | null>(null);
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = useRef<{
    history: AssistantTurn[];
    active: UserTurn | null;
    reply: ReplyState;
  }>({ history: [], active: null, reply: emptyReplyState() });
  const discardRecording = useRef(false);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const duplicateRequest = useRef(0);
  const duplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function settleOpenMeasurement() {
    const timer = answerTimer.current;
    answerTimer.current = null;
    if (!timer) {
      measurement.current = null;
      return;
    }
    clearTimeout(timer);
    const decision = nextQuestionOutcome({
      hold: measurement.current,
      now: Date.now(),
      event: "timeout",
    });
    measurement.current = decision.hold;
    if (decision.mark) void markQuestionOutcome(decision.mark.id, decision.mark.outcome);
  }

  function followQuestion(event: QuestionOutcomeEvent) {
    if (answerTimer.current) clearTimeout(answerTimer.current);
    answerTimer.current = null;
    const decision = nextQuestionOutcome({ hold: measurement.current, now: Date.now(), event });
    measurement.current = decision.hold;
    if (decision.mark) void markQuestionOutcome(decision.mark.id, decision.mark.outcome);
  }

  function holdMeasurement(id: string | null) {
    measurement.current = id ? { id, at: Date.now() } : measurement.current;
  }

  function armAnswered() {
    if (answerTimer.current) clearTimeout(answerTimer.current);
    const hold = measurement.current;
    if (!hold) return;
    answerTimer.current = setTimeout(() => {
      const decision = nextQuestionOutcome({ hold, now: Date.now(), event: "timeout" });
      if (measurement.current?.id === hold.id) measurement.current = decision.hold;
      if (decision.mark) void markQuestionOutcome(decision.mark.id, decision.mark.outcome);
    }, QUESTION_OUTCOME_WINDOW_MS);
  }

  function refreshDuplicates(next: TextTransactionDraft | null, amountText: string) {
    if (duplicateTimer.current) clearTimeout(duplicateTimer.current);
    const request = duplicateRequest.current + 1;
    duplicateRequest.current = request;
    const amount = parseDraftAmount(amountText);
    // Candidates of the old amount must not ride along with a save of the new one.
    setDuplicates([]);
    setDuplicatesRanked(false);
    if (!next || amount === null) {
      setDuplicatesPending(false);
      return;
    }
    setDuplicatesPending(true);
    duplicateTimer.current = setTimeout(() => {
      void listDuplicateCandidates({
        type: next.type,
        date: next.date,
        amount,
        currency: next.currency,
      }).catch(() => []).then(async (found) => {
        if (duplicateRequest.current !== request) return;
        // The transaction this card replaces is not a duplicate of it.
        const rows = found.filter((row) => row.id !== replacing.current?.transactionId);
        setDuplicatesPending(false);
        setDuplicates(rows);
        setDuplicatesRanked(false);
        if (rows.length === 0) return;
        const scores = await rankDuplicateCandidates({
          type: next.type,
          date: next.date,
          amount,
          currency: next.currency,
          description: next.description,
        });
        if (duplicateRequest.current !== request || !scores || scores.length === 0) return;
        setDuplicates(orderCandidatesByRank(rows, scores));
        setDuplicatesRanked(true);
      });
    }, 400);
  }

  function showDraft(input: TextTransactionDraft | null, ruleName: string | null = null) {
    if (!input) {
      setDraft(null);
      originalDraft.current = null;
      idempotency.current = null;
      setAmountInput("");
      setAppliedRuleName(null);
      refreshDuplicates(null, "");
      return;
    }
    // Chomesh starts from the setting, like the form. Only an ordinary income carries it.
    const next: TextTransactionDraft = {
      ...input,
      isChomesh: input.type === "income" ? input.isChomesh ?? autoCalcChomesh : false,
    };
    setDraft(next);
    setAmountInput(String(next.amount));
    idempotency.current = nextDraftIdempotency(idempotency.current, {
      description: next.description,
      amount: String(next.amount),
      type: next.type,
      date: next.date,
    });
    originalDraft.current = {
      description: next.description,
      amount: next.amount,
      date: next.date,
    };
    setAppliedRuleName(ruleName);
    refreshDuplicates(next, String(next.amount));
  }

  function clearConversation() {
    settleOpenMeasurement();
    requestRef.current += 1;
    conversationRef.current = { history: [], active: null, reply: emptyReplyState() };
    memoryRef.current = emptyConversation();
    turnStart.current = emptyConversation();
    contextRef.current = "";
    setText("");
    setIntent(null);
    setDraft(null);
    setRecurring(null);
    savedRecurring.current = null;
    originalDraft.current = null;
    setAmountInput("");
    setDuplicates([]);
    setDuplicatesRanked(false);
    setClarification(null);
    setPendingText("");
    setReceiptFields(null);
    setParsedRule(null);
    setRuleChoice(null);
    setAppliedRuleName(null);
    setHalachaNamespace(null);
    setHalachaUserQuestion(null);
    setChecking(false);
    setPendingPhase(null);
    setElapsed(0);
    setStatus(null);
    setSavedItemId(null);
    setAskIntent(false);
    setIntentConfidence(null);
    setDataReply(null);
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
    previewUrls.current = [];
    setDuplicateScan(null);
    setReceiptArtifactId(null);
    setReceiptLink(null);
    idempotency.current = null;
    savedTransaction.current = null;
    replacing.current = null;
    setHistory([]);
    setActiveUser(null);
    setDuplicateActionFailed(false);
    setConfirmDeleteId(null);
  }

  function replyState(): ReplyState {
    return buildDrawerReplyState({
      checking,
      pendingPhase,
      askIntent,
      intent,
      dataReply,
      duplicateScan,
      confirmDeleteId,
      duplicateActionFailed,
      halachaNamespace,
      halachaUserQuestion,
      inspiration,
      rabbiText,
      rabbiTicket,
      parsedRule,
      ruleChoice,
      clarification,
      specialType,
      receiptFields,
      receiptArtifactId,
      receiptLink,
      recurring,
      splitDrafts,
      splitDropped,
      draft: draft
        ? draftReplyView({
          draft,
          amountInput,
          appliedRuleName,
          duplicates,
          duplicatesRanked,
          original: originalDraft.current,
        })
        : null,
      status,
      savedItemId,
    });
  }

  function syncConversation() {
    conversationRef.current = {
      history,
      active: activeUser,
      reply: replyState(),
    };
  }

  function keepRecording() {
    discardRecording.current = false;
  }

  function disposeAssistant() {
    discardRecording.current = true;
    if (recordTimer.current) clearTimeout(recordTimer.current);
    if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    mediaStream.current = null;
    settleOpenMeasurement();
    const active = recorder.current;
    if (active && active.state !== "inactive") active.stop();
    for (const url of previewUrls.current) URL.revokeObjectURL(url);
  }

  function beginTurn(userTurn: UserTurn) {
    const current = conversationRef.current;
    const shown = current.reply.draft;
    const card = current.reply.recurring;
    // The typed amount is read the way Save reads it. An amount Save would refuse is no amount.
    const typed = shown ? parseDraftAmount(shown.amountInput) : null;
    memoryRef.current = withLiveCard(memoryRef.current, {
      draft: shown ? { ...shown.draft, amount: typed } : null,
      recurring: card ? { ...card, date: card.startDate } : null,
      saved: current.reply.savedItemId ? { itemId: current.reply.savedItemId } : card?.saved ? { itemId: null } : null,
    });
    turnStart.current = memoryRef.current;
    contextRef.current = contextFor(memoryRef.current);
    const next = nextConversation(
      current.history,
      current.active,
      buildReplyBlocks(current.reply),
      userTurn,
      crypto.randomUUID(),
    );
    conversationRef.current = {
      history: next.history,
      active: next.active,
      reply: emptyReplyState(),
    };
    setHistory(next.history);
    setActiveUser(next.active);
    setIntent(null);
    setDraft(null);
    setRecurring(null);
    savedRecurring.current = null;
    originalDraft.current = null;
    setAmountInput("");
    setDuplicates([]);
    setDuplicatesRanked(false);
    setClarification(null);
    setPendingText("");
    setReceiptFields(null);
    setParsedRule(null);
    setRuleChoice(null);
    setAppliedRuleName(null);
    setHalachaNamespace(null);
    setHalachaUserQuestion(null);
    preferRabbi.current = false;
    setRabbiText(null);
    setRabbiTicket(null);
    setAskIntent(false);
    setDataReply(null);
    setDuplicateScan(null);
    setConfirmDeleteId(null);
    setDuplicateActionFailed(false);
    setStatus(null);
    setSavedItemId(null);
    setReceiptArtifactId(null);
    setReceiptLink(null);
    setSpecialType(null);
    // A receipt turn never reaches applyTurn, so an old list or confidence would ride along.
    setSplitDrafts(null);
    setSplitDropped(0);
    setIntentConfidence(null);
    held.current = null;
    idempotency.current = null;
    replacing.current = null;
    setSlotHold(null);
  }

  return {
    platform,
    user,
    t,
    i18n,
    autoCalcChomesh,
    defaultCurrency,
    questionCalendar,
    text,
    setText,
    intent,
    setIntent,
    inspiration,
    setInspiration,
    draft,
    setDraft,
    recurring,
    setRecurring,
    idempotency,
    splitKey,
    splitAttempt,
    splitDuplicateWarned,
    originalDraft,
    savedRecurring,
    recurringSaveId,
    savedTransaction,
    replacing,
    pairActionBusy,
    previewUrls,
    receiptArtifactId,
    setReceiptArtifactId,
    receiptLink,
    setReceiptLink,
    amountInput,
    setAmountInput,
    duplicates,
    setDuplicates,
    duplicatesRanked,
    setDuplicatesRanked,
    duplicatesPending,
    clarification,
    setClarification,
    specialType,
    setSpecialType,
    held,
    splitRef,
    halachaRef,
    preferRabbi,
    pendingText,
    setPendingText,
    receiptFields,
    setReceiptFields,
    parsedRule,
    setParsedRule,
    ruleChoice,
    setRuleChoice,
    appliedRuleName,
    setAppliedRuleName,
    halachaNamespace,
    setHalachaNamespace,
    halachaUserQuestion,
    setHalachaUserQuestion,
    rabbiText,
    setRabbiText,
    rabbiTicket,
    setRabbiTicket,
    saving,
    setSaving,
    checking,
    setChecking,
    pendingPhase,
    setPendingPhase,
    elapsed,
    setElapsed,
    recording,
    setRecording,
    undoing,
    setUndoing,
    savedItemId,
    setSavedItemId,
    status,
    setStatus,
    splitDrafts,
    setSplitDrafts,
    splitDropped,
    setSplitDropped,
    askIntent,
    setAskIntent,
    intentConfidence,
    setIntentConfidence,
    dataReply,
    setDataReply,
    slotHold,
    setSlotHold,
    periodHold,
    nameHold,
    askedQuestion,
    setAskedQuestion,
    confirmDeleteId,
    setConfirmDeleteId,
    duplicateActionFailed,
    setDuplicateActionFailed,
    duplicateScan,
    setDuplicateScan,
    history,
    setHistory,
    activeUser,
    setActiveUser,
    textareaRef,
    recorder,
    requestRef,
    memoryRef,
    turnStart,
    contextRef,
    measurement,
    answerTimer,
    conversationRef,
    discardRecording,
    recordTimer,
    mediaStream,
    elapsedTimer,
    settleOpenMeasurement,
    followQuestion,
    holdMeasurement,
    armAnswered,
    refreshDuplicates,
    showDraft,
    clearConversation,
    replyState,
    beginTurn,
    syncConversation,
    keepRecording,
    disposeAssistant,
  };
}

export type AssistantDrawerState = ReturnType<typeof useAssistantDrawerState>;
