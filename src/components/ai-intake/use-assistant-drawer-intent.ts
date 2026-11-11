import { INSPIRATION_LIBRARY } from "@/lib/ai/inspiration-library";
import {
  browserIdStorage,
  itemsForLanguage,
  pickInspiration,
  readRecentIds,
  rememberInspiration,
} from "@/lib/ai/inspiration-pick";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { trackAiTurnFailed, trackAiQuestionReasked, mapErrorToFailureReason, compareQuestions } from "@/lib/analytics/aiOutcomeEvents";
import { classifyIntentFallback } from "@/lib/ai/intent-fallback";
import { readQuestionSlots } from "@/lib/ai/read-question";
import { resolveQuestionFilter, sumYearType, type QuestionFilter } from "@/lib/ai/sum-year-type";
import { loadStandingOrders, loadTitheBalance } from "@/lib/ai/assistant-extras";
import { getCurrentLocalDate } from "@/lib/utils/local-date";
import { splitItems } from "@/lib/ai/split-items";
import {
  decideTurn,
  openCardEvidence,
  rememberData,
  type TurnDecision,
} from "@/lib/ai/assistant-turn";
import { draftFromHeld, heldFromItem, recurringCardFromItem, type HeldDraft } from "@/lib/ai/split-draft";
import { withChomesh } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import { cardsFromSplit } from "@/lib/ai/split-cards";
import { receiptAsDraft } from "@/lib/ai/receipt-card";
import { dismissDuplicatePair, loadDuplicateScan } from "@/lib/ai/load-duplicate-scan";
import { getPlatform } from "@/lib/platformManager";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import type { DuplicatePair } from "@/lib/ai/duplicate-scan";
import type { IntakeIntent, QuestionSlots, TextTransactionDraft, YearTypeSum } from "@/lib/ai/classify-intake";
import { namedHalachaPage } from "./assistant-shown-intent";
import {
  limitStatus,
  namedQuestionAnswer,
  parsedRuleFromCard,
  publishedPageNamespace,
  readyDataReply,
  sumFailureStatus,
  unnamedQuestionAnswer,
} from "./assistant-drawer-intent";
import type { AssistantDrawerState } from "./use-assistant-drawer-state";

export function useAssistantDrawerIntent(state: AssistantDrawerState) {
  const {
    user,
    i18n,
    defaultCurrency,
    autoCalcChomesh,
    questionCalendar,
    setIntent,
    setInspiration,
    setRecurring,
    splitKey,
    splitAttempt,
    splitDuplicateWarned,
    savedRecurring,
    setReceiptArtifactId,
    setClarification,
    setSpecialType,
    held,
    splitRef,
    halachaRef,
    preferRabbi,
    setPendingText,
    setReceiptFields,
    setParsedRule,
    setRuleChoice,
    setHalachaNamespace,
    setHalachaUserQuestion,
    setRabbiText,
    setRabbiTicket,
    setChecking,
    setPendingPhase,
    setSavedItemId,
    setStatus,
    setSplitDrafts,
    setSplitDropped,
    setAskIntent,
    setIntentConfidence,
    setDataReply,
    slotHold,
    setSlotHold,
    periodHold,
    nameHold,
    askedQuestion,
    setAskedQuestion,
    setConfirmDeleteId,
    setDuplicateActionFailed,
    setDuplicateScan,
    requestRef,
    memoryRef,
    turnStart,
    contextRef,
    followQuestion,
    holdMeasurement,
    armAnswered,
    showDraft,
    beginTurn,
    savedTransaction,
    replacing,
    lastQuestion,
  } = state;
  const { pairActionBusy } = state;

  function showHeld(next: HeldDraft) {
    held.current = next;
    setSpecialType(next.typeQuestion);
    if (next.type === null) {
      setClarification("type");
      showDraft(null);
      return;
    }
    if (next.typeQuestion) {
      setClarification("special");
      showDraft(null);
      return;
    }
    if (next.amount === null) {
      setClarification("amount");
      showDraft(null);
      return;
    }
    const draft = draftFromHeld(next);
    setClarification(null);
    showDraft(draft, next.ruleName);
    if (next.checkAmount) setStatus("checkAmount");
    else if (next.checkDate) setStatus("checkDate");
  }

  function pageNamespace(pageId: string | null): string | null {
    return publishedPageNamespace(pageId);
  }

  function showRabbi(source: string) {
    preferRabbi.current = false;
    setAskIntent(false);
    setIntent(null);
    setRabbiText(source);
    setRabbiTicket(null);
    setHalachaNamespace(null);
    setHalachaUserQuestion(null);
    setReceiptFields(null);
    setClarification(null);
    setSpecialType(null);
    setPendingText(source);
    setParsedRule(null);
    setRuleChoice(null);
    setDataReply(null);
    showDraft(null);
    setRecurring(null);
    savedRecurring.current = null;
    setStatus(null);
    setSavedItemId(null);
  }

  function presentInspiration() {
    const pool = itemsForLanguage(INSPIRATION_LIBRARY, i18n.language);
    const storage = browserIdStorage();
    const next = pickInspiration(pool, readRecentIds(storage), Math.random);
    setInspiration(next);
    if (!next) return;
    rememberInspiration(storage, next.id);
    trackProductEvent("ai_inspiration_shown", { id: next.id });
  }

  async function loadScan() {
    const request = requestRef.current;
    setDuplicateScan({ status: "pending" });
    const result = await loadDuplicateScan();
    if (requestRef.current !== request) return;
    if (!result.ok) {
      setDuplicateScan({ status: "failed" });
      return;
    }
    setConfirmDeleteId(null);
    setDuplicateScan({ status: "ready", count: result.count, pairs: result.pairs });
  }

  function askDelete(id: string) {
    if (pairActionBusy.current) return;
    setConfirmDeleteId(id);
    setDuplicateActionFailed(false);
  }

  /** One pair action at a time: deleting side A, then B before the list reloads, would remove both. */
  async function pairAction(action: () => Promise<boolean>) {
    if (pairActionBusy.current) return;
    pairActionBusy.current = true;
    try {
      if (!await action()) {
        setDuplicateActionFailed(true);
        return;
      }
      await loadScan();
    } finally {
      pairActionBusy.current = false;
    }
  }

  async function dismissPair(pair: DuplicatePair) {
    await pairAction(() => dismissDuplicatePair(pair.left.id, pair.right.id));
  }

  async function confirmDelete(id: string) {
    await pairAction(async () => {
      try {
        await useTableTransactionsStore.getState().deleteTransaction(id, getPlatform());
      } catch {
        return false;
      }
      setConfirmDeleteId(null);
      return true;
    });
  }

  async function showFiltered(question: YearTypeSum, filter: QuestionFilter, request: number) {
    const result = await sumYearType(question, filter);
    if (requestRef.current !== request) return;
    if (!result.ok) {
      trackAiTurnFailed("text", "question", result.reason === "MIXED" ? "unreadable" : "unknown");
      setDataReply({ status: sumFailureStatus(result.reason) });
      return;
    }
    setDataReply(readyDataReply(question, filter, result));
    armAnswered();
  }

  async function loadDataAnswer(
    source: string,
    searchDescriptions = false,
    family?: NonNullable<QuestionSlots["family"]>,
    /** The asking message's turn. A later read (a chip, a family) has none and pays on its own. */
    turn?: string,
  ) {
    const request = requestRef.current;
    followQuestion(family ? "family" : searchDescriptions ? "search" : "ask");
    setDataReply(null);
    
    if (turn) {
      const now = Date.now();
      const current = { text: source, family: family || "", search: searchDescriptions };
      
      if (compareQuestions(current, lastQuestion.current, 60000, now, lastQuestion.current?.at ?? null)) {
        trackAiQuestionReasked(60);
      }
      
      lastQuestion.current = { ...current, at: now };
    }
    
    let question = searchDescriptions ? askedQuestion : null;
    if (!question) {
      const read = family && slotHold ? null : await readQuestionSlots(source, {
        calendar: questionCalendar,
        today: getCurrentLocalDate(),
        context: contextRef.current,
        turn,
      });
      if (read && "limit" in read) {
        trackAiTurnFailed("text", "question", "limit");
        setStatus(limitStatus(read.limit));
        state.setLimitInfo(read.limit);
        return;
      }
      if (read) {
        periodHold.current = read.period;
        nameHold.current = read.nameText;
      }
      if (read?.measurementId) holdMeasurement(read.measurementId);
      if (requestRef.current !== request) return;
      const decision = decideTurn({
        message: source,
        jev: { ok: true, intent: "ask_data", confidence: 1 },
        reader: splitRef.current,
        question: read
          ? {
            slots: {
              family: read.family,
              measure: read.measure,
              recipient: read.recipient,
              category: read.category,
              paymentMethod: read.paymentMethod,
              subject: read.subject ?? null,
            },
            period: read.period,
            nameText: read.nameText,
          }
          : null,
        questionAttempted: true,
        forcedIntent: "ask_data",
        preferRabbi: preferRabbi.current,
        chosenFamily: family ?? null,
        slotHold: family && slotHold ? slotHold : null,
        periodHold: periodHold.current,
        nameHold: nameHold.current,
        state: turnStart.current,
        today: getCurrentLocalDate(),
        calendar: questionCalendar,
      });
      memoryRef.current = rememberData(memoryRef.current, decision.nextState);
      if (decision.data.status === "period_missing") {
        setDataReply({ status: "period_missing" });
        return;
      }
      if (decision.data.status === "family_missing") {
        if (decision.data.hold) setSlotHold(decision.data.hold);
        setDataReply({ status: "family_missing", source });
        return;
      }
      if (decision.data.status === "rabbi") {
        showRabbi(source);
        return;
      }
      if (decision.data.status === "balance") {
        const balance = await loadTitheBalance(user?.id ?? null);
        if (requestRef.current !== request) return;
        setDataReply(balance ? { status: "balance", ...balance } : { status: "failed" });
        return;
      }
      if (decision.data.status === "standing_orders") {
        const rows = await loadStandingOrders().catch(() => null);
        if (requestRef.current !== request) return;
        setDataReply(rows ? { status: "standing_orders", rows } : { status: "failed" });
        return;
      }
      if (decision.data.status !== "ready") {
        setDataReply({ status: "unsupported" });
        return;
      }
      question = decision.data.question;
    }
    if (!question) {
      setDataReply({ status: "unsupported" });
      return;
    }
    setAskedQuestion(question);
    const filter = await resolveQuestionFilter(question, searchDescriptions);
    if (requestRef.current !== request) return;
    const named = decideTurn({
      message: source,
      jev: { ok: true, intent: "ask_data", confidence: 1 },
      reader: splitRef.current,
      question: null,
      questionAttempted: true,
      forcedIntent: "ask_data",
      settledQuestion: question,
      nameCheck: filter,
      state: turnStart.current,
      today: getCurrentLocalDate(),
      calendar: questionCalendar,
    });
    memoryRef.current = rememberData(memoryRef.current, named.nextState);
    if (named.data.status === "name_missing") {
      setDataReply({
        status: "category_missing",
        topic: named.data.topic,
        source,
        kind: named.data.missing,
        suggestions: named.data.suggestions,
        family: named.data.family,
      });
      return;
    }
    if (named.data.status !== "ready" || "missing" in filter) {
      setDataReply({ status: "unsupported" });
      return;
    }
    await showFiltered(named.data.question, filter, request);
  }

  async function answerWithName(name: string) {
    if (!askedQuestion) return;
    const next = namedQuestionAnswer(askedQuestion, name);
    setAskedQuestion(next.question);
    setDataReply(null);
    await showFiltered(next.question, next.filter, requestRef.current);
  }

  async function answerWithoutName() {
    if (!askedQuestion) return;
    const next = unnamedQuestionAnswer(askedQuestion);
    setAskedQuestion(next.question);
    setDataReply(null);
    await showFiltered(next.question, next.filter, requestRef.current);
  }

  function applyTurn(source: string, decision: TurnDecision, turn?: string) {
    memoryRef.current = decision.nextState;
    if (decision.preferRabbi) preferRabbi.current = true;
    if (decision.mode === "ask") {
      setAskIntent(true);
      setIntent(null);
      setReceiptFields(null);
      setClarification(null);
      setSpecialType(null);
      setPendingText(source);
      setParsedRule(null);
      setRuleChoice(null);
      setHalachaNamespace(null);
      setHalachaUserQuestion(null);
      showDraft(null);
      setRecurring(null);
      savedRecurring.current = null;
      setStatus(null);
      setSavedItemId(null);
      return;
    }
    if (decision.mode === "rabbi" || decision.data.status === "rabbi") {
      showRabbi(source);
      return;
    }
    const split = splitRef.current;
    const several = split && split.ok && split.route === "several" ? split : null;
    setAskIntent(false);
    setIntent(decision.intent);
    setReceiptFields(null);
    setPendingText(source);
    setClarification(null);
    setSpecialType(null);
    held.current = null;
    setParsedRule(parsedRuleFromCard(decision.card));
    setRuleChoice(null);
    setHalachaNamespace(decision.publishedPage ? pageNamespace(decision.publishedPage) : null);
    setHalachaUserQuestion(decision.publishedPage ? source : null);
    setRabbiText(null);
    setRabbiTicket(null);
    // Set before the card is drawn, so its duplicate check leaves out the transaction it replaces.
    replacing.current = decision.replaces && savedTransaction.current?.itemId === decision.replaces
      ? savedTransaction.current
      : null;
    showDraft(null);
    savedRecurring.current = null;
    setRecurring(null);
    setSplitDrafts(null);
    setSplitDropped(0);
    setStatus(null);
    setSavedItemId(null);
    setReceiptArtifactId(null);
    switch (decision.card.type) {
      case "none":
      case "rule":
        break;
      case "could_not_read":
        setStatus("couldNotRead");
        break;
      case "split_list":
        setStatus("splitList");
        break;
      case "drafts":
        splitKey.current = crypto.randomUUID();
        splitAttempt.current = 0;
        splitDuplicateWarned.current = null;
        setSplitDropped(decision.card.dropped);
        setSplitDrafts(several ? cardsFromSplit(several.items, { defaultCurrency, autoCalcChomesh }) : null);
        break;
      case "clarify":
      case "draft": {
        const first = several?.items[0];
        if (!first) {
          setStatus("couldNotRead");
          break;
        }
        showHeld(heldFromItem(first, defaultCurrency));
        if (replacing.current && !first.checkAmount && !first.checkDate) setStatus("replacesSaved");
        break;
      }
      case "recurring":
        setRecurring(several?.items[0] ? recurringCardFromItem(several.items[0], defaultCurrency) : null);
        if (several?.items[0]?.checkAmount) setStatus("checkAmount");
        break;
      case "frequency_unsupported":
        setStatus("frequencyUnsupported");
        break;
      case "discarded":
        setStatus("discarded");
        break;
      case "already_saved": {
        const saved = turnStart.current.onScreen?.savedItemId;
        if (saved) setSavedItemId(saved);
        setStatus("alreadySaved");
        break;
      }
      default: {
        const unreachable: never = decision.card;
        return unreachable;
      }
    }
    if (decision.frequencyBlocked) setStatus("frequencyUnsupported");
    if (decision.side === "duplicates") void loadScan();
    else setDuplicateScan(null);
    if (decision.side === "inspiration") presentInspiration();
    else setInspiration(null);
    if (decision.needsQuestion) {
      void loadDataAnswer(source, false, undefined, turn);
      return;
    }
    if (decision.data.status === "skip") setDataReply(null);
  }

  function showIntent(source: string, nextIntent: IntakeIntent, withData = false, userText?: string) {
    applyTurn(source, decideTurn({
      message: source,
      jev: { ok: true, intent: nextIntent, confidence: 1, halachaPage: halachaRef.current, halachaPageConfidence: 1 },
      reader: splitRef.current,
      question: null,
      questionAttempted: false,
      forcedIntent: nextIntent,
      withData,
      preferRabbi: preferRabbi.current,
      knownHalachaPage: halachaRef.current,
      state: turnStart.current,
      userText,
      today: getCurrentLocalDate(),
      calendar: questionCalendar,
    }));
  }

  async function handleSubmit(spoken?: string, kind: "text" | "voice" = "text", skipBeginTurn = false) {
    const source = spoken ?? state.text;
    const today = getCurrentLocalDate();
    if (!source.trim()) return;
    const request = ++requestRef.current;
    if (!skipBeginTurn) {
      beginTurn(kind === "voice" ? { kind: "voice", text: source } : { kind: "text", text: source });
    }
    state.setText("");
    setPendingPhase(kind === "voice" ? "voice" : "reading");
    setChecking(true);
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const turn = crypto.randomUUID();
    const splitPromise = splitItems(source, today, {
      timeZone: zone,
      receivedAt: new Date().toISOString(),
      defaultCurrency,
      calendar: questionCalendar,
      context: contextRef.current,
      cardEvidence: openCardEvidence(turnStart.current),
      turn,
    });
    const decided = await classifyIntentFallback(source, contextRef.current, turn);
    const read = await splitPromise;
    if (requestRef.current !== request) return;
    setChecking(false);
    if (!decided.ok && decided.reason === "LIMIT") {
      trackAiTurnFailed(kind, "intent", "limit");
      setStatus(limitStatus(decided.limit));
      state.setLimitInfo(decided.limit);
      setIntent(null);
      setAskIntent(false);
      return;
    }
    if (!decided.ok) {
      trackAiTurnFailed(kind, "intent", mapErrorToFailureReason(undefined, decided.reason));
    }
    if (!read.ok && read.reason === "LIMIT") {
      trackAiTurnFailed(kind, "split", "limit");
      setStatus(limitStatus(read.limit));
      state.setLimitInfo(read.limit);
      setIntent(null);
      setAskIntent(false);
      return;
    }
    if (!read.ok) {
      trackAiTurnFailed(kind, "split", mapErrorToFailureReason(undefined, read.reason));
    }
    const split = read.ok && read.route === "several" && decided.ok && decided.chomesh
      ? { ...read, items: withChomesh(read.items, true) }
      : read;
    splitRef.current = split;
    const namedPage = decided.ok ? namedHalachaPage(decided.halachaPage, decided.halachaPageConfidence) : null;
    halachaRef.current = namedPage === "personal" ? null : namedPage;
    preferRabbi.current = false;
    setIntentConfidence(decided.ok ? decided.confidence : null);
    const decision = decideTurn({
      message: source,
      jev: decided.ok
        ? {
          ok: true,
          intent: decided.intent,
          confidence: decided.confidence,
          halachaPage: decided.halachaPage,
          halachaPageConfidence: decided.halachaPageConfidence,
        }
        : { ok: false },
      reader: split,
      question: null,
      questionAttempted: false,
      state: turnStart.current,
      today,
      calendar: questionCalendar,
    });
    applyTurn(source, decision, turn);
  }

  function handleChooseIntent(nextIntent: IntakeIntent) {
    const source = state.pendingText;
    showIntent(source, nextIntent);
  }

  function handleChooseType(type: TextTransactionDraft["type"]) {
    if (state.receiptFields) {
      showDraft(receiptAsDraft(state.receiptFields, type));
      if (state.receiptFields.checkDate) setStatus("checkDate");
      setReceiptFields(null);
      setClarification(null);
      return;
    }
    const next = held.current;
    if (!next) {
      setClarification("amount");
      return;
    }
    const filled = { ...next, type, typeQuestion: null };
    showHeld(filled);
  }

  function handleChooseSpecial(yes: boolean) {
    const next = held.current;
    if (!next) return;
    const special = next.typeQuestion;
    const filled = yes && special ? { ...next, type: special, typeQuestion: null } : { ...next, typeQuestion: null };
    showHeld(filled);
    const name = filled.description.trim();
    if (yes && special && name.length >= 2 && !filled.ruleName) {
      setParsedRule({ name, action: special });
      setRuleChoice(null);
    }
  }

  return {
    showHeld,
    showRabbi,
    presentInspiration,
    loadScan,
    askDelete,
    dismissPair,
    confirmDelete,
    loadDataAnswer,
    answerWithName,
    answerWithoutName,
    applyTurn,
    showIntent,
    handleSubmit,
    handleChooseIntent,
    handleChooseType,
    handleChooseSpecial,
  };
}

export type AssistantDrawerIntent = ReturnType<typeof useAssistantDrawerIntent>;
