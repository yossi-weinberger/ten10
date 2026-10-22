import { useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";
import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { usePlatform } from "@/contexts/PlatformContext";
import { isAiIntakeEnabled } from "@/lib/ai/flags";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  applyForwardRule,
  clarificationField,
  draftFromText,
  questionFromSlots,
  type QuestionSlots,
  type YearTypeSum,
  parseUserRule,
  selectHalachaPage,
  type ActiveUserRule,
  type ClarificationField,
  type IntakeIntent,
  type ParsedUserRule,
  type RuleActionType,
  type TextTransactionDraft,
} from "@/lib/ai/classify-intake";
import { refreshAfterIntakeSave } from "@/lib/ai/refresh-after-intake";
import { nextDraftIdempotency, saveTextDraft, type DraftIdempotency } from "@/lib/ai/save-text-draft";
import { undoTextIntake } from "@/lib/ai/undo-text-intake";
import { approveUserRule, listActiveUserRules } from "@/lib/ai/user-rules";
import {
  listDuplicateCandidates,
  type DuplicateCandidate,
} from "@/lib/ai/duplicate-candidates";
import { orderCandidatesByRank } from "@/lib/ai/duplicate-rank";
import { rankDuplicateCandidates } from "@/lib/ai/rank-duplicates";
import { recordShadowType } from "@/lib/ai/shadow-type";
import { classifyIntentFallback } from "@/lib/ai/intent-fallback";
import { readReceiptImage } from "@/lib/ai/read-receipt";
import { openAiReceipt } from "@/lib/ai/open-receipt";
import { isIsoDate, receiptAsDraft, receiptRuledDraft, type ReceiptFields } from "@/lib/ai/receipt-card";
import { dismissDuplicatePair, loadDuplicateScan } from "@/lib/ai/load-duplicate-scan";
import { getPlatform } from "@/lib/platformManager";
import { useDonationStore } from "@/lib/store";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import type { DuplicatePair } from "@/lib/ai/duplicate-scan";
import { readQuestionSlots } from "@/lib/ai/read-question";
import {
  QUESTION_OUTCOME_WINDOW_MS,
  markQuestionOutcome,
  nextQuestionOutcome,
  type MeasurementHold,
  type QuestionOutcomeEvent,
} from "@/lib/ai/question-outcome";
import { resolveQuestionFilter, sumYearType } from "@/lib/ai/sum-year-type";
import { transcribeSpeech } from "@/lib/ai/transcribe-speech";
import { isOnOrAfterMinTransactionDate } from "@/lib/utils/transaction-date";
import { AssistantComposer } from "./AssistantComposer";
import { AssistantShell } from "./AssistantShell";
import { AssistantThread } from "./AssistantThread";
import {
  buildReplyBlocks,
  emptyReplyState,
  nextConversation,
  type AssistantTurn,
  type ReplyState,
  type StatusKey,
  type UserTurn,
} from "./assistant-reply-view";
import { shownIntent } from "./assistant-shown-intent";
import { levelFromSamples } from "./assistant-audio-level";

export interface AssistantDrawerHandle {
  receive(file: File): void;
  receiveText(text: string): void;
}

interface AssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiveRef: RefObject<AssistantDrawerHandle | null>;
}

export function AssistantDrawer({
  open,
  onOpenChange,
  receiveRef,
}: AssistantDrawerProps) {
  const { platform } = usePlatform();
  const { t } = useTranslation([
    "navigation",
    "transactions",
    "halacha-expenses",
    "halacha-income",
    "halacha-chomesh",
    "halacha-tithes",
  ]);
  const calendarType = useDonationStore((state) => state.settings.calendarType);
  const questionCalendar = calendarType === "hebrew" ? "hebrew" : "gregorian";
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<IntakeIntent | null>(null);
  const [draft, setDraft] = useState<TextTransactionDraft | null>(null);
  const idempotency = useRef<DraftIdempotency | null>(null);
  const originalDraft = useRef<{ description: string; amount: number; date: string } | null>(null);
  const previewUrls = useRef<string[]>([]);
  const [receiptArtifactId, setReceiptArtifactId] = useState<string | null>(null);
  const [receiptLink, setReceiptLink] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [duplicatesRanked, setDuplicatesRanked] = useState(false);
  const [clarification, setClarification] = useState<ClarificationField | null>(null);
  const [pendingText, setPendingText] = useState("");
  const [chosenType, setChosenType] = useState<TextTransactionDraft["type"] | null>(null);
  const [receiptFields, setReceiptFields] = useState<ReceiptFields | null>(null);
  const [amountReply, setAmountReply] = useState("");
  const [rules, setRules] = useState<ActiveUserRule[]>([]);
  const [parsedRule, setParsedRule] = useState<ParsedUserRule | null>(null);
  const [ruleChoice, setRuleChoice] = useState<RuleActionType | null>(null);
  const [appliedRuleName, setAppliedRuleName] = useState<string | null>(null);
  const [halachaNamespace, setHalachaNamespace] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [pendingPhase, setPendingPhase] = useState<"reading" | "receipt" | "voice" | null>(null);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [recording, setRecording] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusKey | null>(null);
  const [askIntent, setAskIntent] = useState(false);
  const [intentConfidence, setIntentConfidence] = useState<number | null>(null);
  const [dataReply, setDataReply] = useState<
    | { status: "ready"; year: number; month: number | null; measure: "sum" | "count" | "average" | "max"; type: "donation" | "expense" | "income"; paymentMethod: string | null; recipient: string | null; category: string | null; from: string; to: string; total: number; count: number; currency: string | null }
    | { status: "category_missing"; topic: string; source: string; kind: "category" | "recipient" }
    | { status: "family_missing"; source: string }
    | { status: "mixed" | "unsupported" | "failed" }
    | null
  >(null);
  const [slotHold, setSlotHold] = useState<QuestionSlots | null>(null);
  const [askedQuestion, setAskedQuestion] = useState<YearTypeSum | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [duplicateActionFailed, setDuplicateActionFailed] = useState(false);
  const [duplicateScan, setDuplicateScan] = useState<
    | { status: "pending" }
    | { status: "ready"; count: number; pairs: DuplicatePair[] }
    | { status: "failed" }
    | null
  >(null);

  function todayIso(): string {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }

  const [history, setHistory] = useState<AssistantTurn[]>([]);
  const [activeUser, setActiveUser] = useState<UserTurn | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const requestRef = useRef(0);
  const measurement = useRef<MeasurementHold | null>(null);
  const answerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = useRef<{
    history: AssistantTurn[];
    active: UserTurn | null;
    reply: ReplyState;
  }>({ history: [], active: null, reply: emptyReplyState() });
  const discardRecording = useRef(false);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioFrame = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);
  const levelTick = useRef(0);

  function stopMeter() {
    if (audioFrame.current) cancelAnimationFrame(audioFrame.current);
    audioFrame.current = 0;
    void audioContext.current?.close();
    audioContext.current = null;
    setLevel(0);
  }

  function stopRecording() {
    discardRecording.current = true;
    stopMeter();
    if (recordTimer.current) {
      clearTimeout(recordTimer.current);
      recordTimer.current = null;
    }
    const active = recorder.current;
    if (active && active.state !== "inactive") active.stop();
  }

  function clearConversation() {
    requestRef.current += 1;
    conversationRef.current = { history: [], active: null, reply: emptyReplyState() };
    setText("");
    setIntent(null);
    setDraft(null);
    originalDraft.current = null;
    setAmountInput("");
    setDuplicates([]);
    setDuplicatesRanked(false);
    setClarification(null);
    setPendingText("");
    setChosenType(null);
    setReceiptFields(null);
    setAmountReply("");
    setParsedRule(null);
    setRuleChoice(null);
    setAppliedRuleName(null);
    setHalachaNamespace(null);
    setChecking(false);
    setPendingPhase(null);
    setLevel(0);
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
    setHistory([]);
    setActiveUser(null);
    setDuplicateActionFailed(false);
    setConfirmDeleteId(null);
    if (answerTimer.current) clearTimeout(answerTimer.current);
    answerTimer.current = null;
    measurement.current = null;
  }

  function handleOpenChange(next: boolean) {
    if (next) discardRecording.current = false;
    else {
      stopRecording();
      clearConversation();
    }
    onOpenChange(next);
  }

  useEffect(() => {
    if (!open) return;
    void listActiveUserRules().then(setRules);
  }, [open]);

  useEffect(() => {
    return () => {
      discardRecording.current = true;
      if (recordTimer.current) clearTimeout(recordTimer.current);
      if (answerTimer.current) clearTimeout(answerTimer.current);
      const active = recorder.current;
      if (active && active.state !== "inactive") active.stop();
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
    };
  }, []);

  const duplicateRequest = useRef(0);
  const receiptInput = useRef<HTMLInputElement | null>(null);
  const duplicateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function refreshDuplicates(next: TextTransactionDraft | null, amountText: string) {
    if (duplicateTimer.current) clearTimeout(duplicateTimer.current);
    const request = duplicateRequest.current + 1;
    duplicateRequest.current = request;
    const amount = Number(amountText.replace(",", "."));
    if (!next || !Number.isFinite(amount) || amount === 0) {
      setDuplicates([]);
      setDuplicatesRanked(false);
      return;
    }
    duplicateTimer.current = setTimeout(() => {
      void listDuplicateCandidates({
        type: next.type,
        date: next.date,
        amount,
        currency: next.currency,
      }).then(async (rows) => {
        if (duplicateRequest.current !== request) return;
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

  function showDraft(next: TextTransactionDraft | null, source: string) {
    if (!next) {
      setDraft(null);
      originalDraft.current = null;
      idempotency.current = null;
      setAmountInput("");
      setAppliedRuleName(null);
      refreshDuplicates(null, "");
      return;
    }
    const applied = applyForwardRule(next, rules, source);
    setDraft(applied.draft);
    setAmountInput(String(applied.draft.amount));
    idempotency.current = nextDraftIdempotency(idempotency.current, {
      description: applied.draft.description,
      amount: String(applied.draft.amount),
      type: applied.draft.type,
      date: applied.draft.date,
    });
    originalDraft.current = {
      description: applied.draft.description,
      amount: applied.draft.amount,
      date: applied.draft.date,
    };
    setAppliedRuleName(applied.ruleName);
    refreshDuplicates(applied.draft, String(applied.draft.amount));
  }

  async function openReceiptFile() {
    const artifactId = receiptArtifactId;
    if (!artifactId) return;
    setReceiptLink(null);
    const result = await openAiReceipt({ artifactId });
    if (result.status === "opened") return;
    if (result.status === "blocked") {
      setReceiptLink(result.url);
      return;
    }
    setStatus(result.status === "none" ? "receiptMissing" : "receiptUnavailable");
  }

  async function handleReceipt(file: File | undefined) {
    if (!file) return;
    const request = ++requestRef.current;
    const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
    if (previewUrl) previewUrls.current.push(previewUrl);
    beginTurn({ kind: "receipt", fileName: file.name, mimeType: file.type, previewUrl });
    setPendingPhase("receipt");
    setChecking(true);
    setStatus(null);
    const result = await readReceiptImage(file);
    if (requestRef.current !== request) return;
    setChecking(false);
    if (receiptInput.current) receiptInput.current.value = "";
    if (!result.ok) {
      setReceiptArtifactId(null);
      setIntent(null);
      setReceiptFields(null);
      showDraft(null, "");
      setStatus(
        result.reason === "TOO_LARGE"
          ? "receiptTooLarge"
          : result.reason === "UNAVAILABLE"
            ? "providerFailed"
            : "receiptUnreadable",
      );
      return;
    }
    setIntent("add_transaction");
    setPendingText("");
    setChosenType(null);
    setAmountReply("");
    setParsedRule(null);
    setRuleChoice(null);
    setHalachaNamespace(null);
    setReceiptArtifactId(result.artifactId);
    const ruled = receiptRuledDraft(result.fields, rules);
    if (ruled) {
      setReceiptFields(null);
      setClarification(null);
      showDraft(ruled.draft, result.fields.description);
      return;
    }
    setReceiptFields(result.fields);
    setClarification("type");
    showDraft(null, "");
  }

  async function finishVoice(blob: Blob) {
    const request = ++requestRef.current;
    setPendingPhase("voice");
    setChecking(true);
    const heard = await transcribeSpeech(blob);
    if (requestRef.current !== request) return;
    setChecking(false);
    if (!heard.ok) {
      setStatus(
        heard.reason === "TOO_LONG"
          ? "voiceTooLong"
          : heard.reason === "UNAVAILABLE"
            ? "providerFailed"
            : "voiceUnheard",
      );
      return;
    }
    setText("");
    await handleSubmit(heard.text, "voice");
  }

  async function toggleRecording() {
    if (checking) return;
    const active = recorder.current;
    if (active && active.state !== "inactive") {
      active.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("voiceDenied");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus("voiceDenied");
      return;
    }
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "";
    const media = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.current = media;
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    media.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      stopMeter();
      if (recordTimer.current) clearTimeout(recordTimer.current);
      recorder.current = null;
      setRecording(false);
      if (discardRecording.current) return;
      void finishVoice(new Blob(chunks, { type: media.mimeType || "audio/webm" }));
    };
    media.start();
    setRecording(true);
    setStatus(null);
    const started = Date.now();
    if (typeof AudioContext !== "undefined") {
      const context = new AudioContext();
      audioContext.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      context.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const tick = () => {
        const now = Date.now();
        if (now - levelTick.current >= 66) {
          levelTick.current = now;
          analyser.getByteTimeDomainData(samples);
          setLevel(levelFromSamples(samples));
          setElapsed(Math.min(60, Math.floor((now - started) / 1000)));
        }
        audioFrame.current = requestAnimationFrame(tick);
      };
      audioFrame.current = requestAnimationFrame(tick);
    }
    recordTimer.current = setTimeout(() => {
      if (media.state !== "inactive") media.stop();
    }, 60_000);
  }

  function showIntent(source: string, today: string, nextIntent: IntakeIntent) {
    const field = nextIntent === "add_transaction" ? clarificationField(source, today) : null;
    setAskIntent(false);
    setIntent(nextIntent);
    setReceiptFields(null);
    setClarification(field);
    setPendingText(source);
    setChosenType(null);
    setAmountReply("");
    setParsedRule(nextIntent === "create_rule" ? parseUserRule(source) : null);
    setRuleChoice(null);
    setHalachaNamespace(
      nextIntent === "domain_adjacent" ? selectHalachaPage(source)?.namespace ?? null : null,
    );
    showDraft(
      field === null && nextIntent === "add_transaction" ? draftFromText(source, today) : null,
      source,
    );
    setStatus(null);
    setSavedItemId(null);
    setReceiptArtifactId(null);
    if (nextIntent === "ask_data") void loadDataAnswer(source);
    else setDataReply(null);
    if (nextIntent === "find_duplicates") void loadScan();
    else setDuplicateScan(null);
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
    setConfirmDeleteId(id);
    setDuplicateActionFailed(false);
  }

  async function dismissPair(pair: DuplicatePair) {
    const saved = await dismissDuplicatePair(pair.left.id, pair.right.id);
    if (!saved) {
      setDuplicateActionFailed(true);
      return;
    }
    await loadScan();
  }

  async function confirmDelete(id: string) {
    try {
      await useTableTransactionsStore.getState().deleteTransaction(id, getPlatform());
    } catch {
      setDuplicateActionFailed(true);
      return;
    }
    setConfirmDeleteId(null);
    await loadScan();
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

  async function loadDataAnswer(
    source: string,
    searchDescriptions = false,
    family?: NonNullable<QuestionSlots["family"]>,
  ) {
    const request = requestRef.current;
    followQuestion(family ? "family" : searchDescriptions ? "search" : "ask");
    setDataReply(null);
    let question = searchDescriptions ? askedQuestion : null;
    if (!question) {
      const read = family && slotHold ? null : await readQuestionSlots(source);
      const slots = family && slotHold
        ? { ...slotHold, family }
        : read;
      if (read?.measurementId) holdMeasurement(read.measurementId);
      if (requestRef.current !== request) return;
      const composed = questionFromSlots(source, todayIso(), questionCalendar, slots);
      if (composed === "ask_family") {
        if (slots) setSlotHold(slots);
        setDataReply({ status: "family_missing", source });
        return;
      }
      question = composed;
    }
    if (!question) {
      setDataReply({ status: "unsupported" });
      return;
    }
    setAskedQuestion(question);
    const filter = await resolveQuestionFilter(question, searchDescriptions);
    if (requestRef.current !== request) return;
    if ("missing" in filter) {
      setDataReply({ status: "category_missing", topic: filter.name, source, kind: filter.missing });
      return;
    }
    const result = await sumYearType(question, filter);
    if (requestRef.current !== request) return;
    if (!result.ok) {
      setDataReply({ status: result.reason === "MIXED" ? "mixed" : "failed" });
      return;
    }
    setDataReply({
      status: "ready",
      year: question.year,
      month: question.month,
      measure: question.measure,
      type: question.type,
      paymentMethod: question.paymentMethod,
      recipient: filter.recipient ?? (question.recipient ? filter.description : null),
      category: filter.category ?? (!question.recipient && filter.description ? filter.description : null),
      from: question.from,
      to: question.to,
      total: result.total,
      count: result.count,
      currency: result.currency,
    });
    armAnswered();
  }

  function replyState(): ReplyState {
    return {
      ...emptyReplyState(),
      checking,
      pendingPhase,
      askIntent,
      intent,
      dataReply,
      duplicateScan,
      confirmDeleteId,
      duplicateActionFailed,
      halachaNamespace,
      parsedRule,
      ruleChoice,
      clarification,
      receiptFields,
      receiptArtifactId,
      receiptLink,
      draft: draft
        ? {
          draft,
          amountInput,
          appliedRuleName,
          duplicates,
          duplicatesRanked,
          inferred: originalDraft.current
            ? {
              amount: amountInput === String(originalDraft.current.amount),
              date: draft.date === originalDraft.current.date,
              description: draft.description === originalDraft.current.description,
            }
            : undefined,
        }
        : null,
      status,
      savedItemId,
    };
  }

  conversationRef.current = {
    history,
    active: activeUser,
    reply: replyState(),
  };

  function beginTurn(user: UserTurn) {
    const current = conversationRef.current;
    const next = nextConversation(
      current.history,
      current.active,
      buildReplyBlocks(current.reply),
      user,
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
    originalDraft.current = null;
    setAmountInput("");
    setDuplicates([]);
    setDuplicatesRanked(false);
    setClarification(null);
    setPendingText("");
    setChosenType(null);
    setReceiptFields(null);
    setAmountReply("");
    setParsedRule(null);
    setRuleChoice(null);
    setAppliedRuleName(null);
    setHalachaNamespace(null);
    setAskIntent(false);
    setDataReply(null);
    setDuplicateScan(null);
    setConfirmDeleteId(null);
    setDuplicateActionFailed(false);
    setStatus(null);
    setSavedItemId(null);
    setReceiptArtifactId(null);
    setReceiptLink(null);
    idempotency.current = null;
    setSlotHold(null);
  }

  async function handleSubmit(spoken?: string, kind: "text" | "voice" = "text") {
    const source = spoken ?? text;
    const today = todayIso();
    if (!source.trim()) return;
    const request = ++requestRef.current;
    beginTurn(kind === "voice" ? { kind: "voice", text: source } : { kind: "text", text: source });
    setText("");
    setPendingPhase(kind === "voice" ? "voice" : "reading");
    setChecking(true);
    const decided = await classifyIntentFallback(source);
    if (requestRef.current !== request) return;
    setIntentConfidence(decided.ok ? decided.confidence : null);
    setChecking(false);
    const next = shownIntent(source, today, decided);
    if (next === "ask") {
      setAskIntent(true);
      setIntent(null);
      setReceiptFields(null);
      setClarification(null);
      setPendingText(source);
      setChosenType(null);
      setParsedRule(null);
      setRuleChoice(null);
      setHalachaNamespace(null);
      showDraft(null, "");
      setStatus(null);
      setSavedItemId(null);
      return;
    }
    showIntent(source, today, next);
  }

  function handleChooseIntent(nextIntent: IntakeIntent) {
    const source = pendingText;
    const today = todayIso();
    if (nextIntent === "create_rule" && !parseUserRule(source)) {
      showIntent(source, today, "out_of_scope");
      return;
    }
    showIntent(source, today, nextIntent);
  }

  function handleChooseType(type: TextTransactionDraft["type"]) {
    if (receiptFields) {
      setChosenType(type);
      showDraft(receiptAsDraft(receiptFields, type), receiptFields.description);
      setReceiptFields(null);
      setClarification(null);
      return;
    }
    const next = draftFromText(pendingText, todayIso());
    setChosenType(type);
    if (next) {
      showDraft({ ...next, type }, pendingText);
      setClarification(null);
      return;
    }
    showDraft(null, pendingText);
    setClarification("amount");
  }

  function handleAmountReply(reply = amountReply) {
    const trimmed = reply.trim();
    if (!trimmed) return;
    requestRef.current += 1;
    beginTurn({ kind: "text", text: trimmed });
    setIntent("add_transaction");
    setText("");
    const source = `${pendingText} ${trimmed}`;
    const next = draftFromText(source, todayIso());
    if (!next) return;
    showDraft(chosenType ? { ...next, type: chosenType } : next, source);
    setClarification(null);
  }

  async function handleApproveRule() {
    if (!parsedRule || saving) return;
    const type = parsedRule.action === "ambiguous" ? ruleChoice : parsedRule.action;
    if (!type) return;
    setSaving(true);
    const saved = await approveUserRule(parsedRule.name, type, todayIso());
    setSaving(false);
    if (!saved) {
      setStatus("ruleFailed");
      return;
    }
    setRules((current) => [...current, { name: parsedRule.name, type }]);
    setParsedRule(null);
    setRuleChoice(null);
    setStatus("ruleSaved");
  }

  async function handleSave(choice?: "saved_anyway" | "same_event") {
    if (!draft || saving || savedItemId) return;
    if (!isIsoDate(draft.date)) {
      setStatus("editDateInvalid");
      return;
    }
    if (!isOnOrAfterMinTransactionDate(draft.date)) {
      setStatus("dateMin");
      return;
    }
    const amount = Number(amountInput.replace(",", "."));
    if (!Number.isFinite(amount) || amount === 0) {
      setStatus("editAmountInvalid");
      return;
    }
    setSaving(true);
    setStatus(null);
    const savingDraft = { ...draft, amount };
    idempotency.current = nextDraftIdempotency(idempotency.current, {
      description: savingDraft.description,
      amount: amountInput,
      type: savingDraft.type,
      date: savingDraft.date,
    });
    const result = await saveTextDraft(
      savingDraft,
      idempotency.current.key,
      originalDraft.current ?? { description: draft.description, amount },
      duplicates.length > 0 && choice
        ? { choice, candidateIds: duplicates.map((row) => row.id) }
        : undefined,
      intentConfidence,
      receiptArtifactId,
    );
    setSaving(false);
    if (result.ok && result.sameEvent) {
      setStatus("duplicateKept");
      return;
    }
    if (result.ok) {
      void recordShadowType(result.itemId, chosenType !== null);
      setSavedItemId(result.itemId);
      refreshAfterIntakeSave();
      setStatus("saved");
      navigator.vibrate?.(12);
      return;
    }
    if (result.reason === "SAVE_FAILED") {
      idempotency.current = nextDraftIdempotency(idempotency.current, {
        description: savingDraft.description,
        amount: amountInput,
        type: savingDraft.type,
        date: savingDraft.date,
      }, { saveFailed: true });
    }
    setStatus(result.reason === "NO_RATE" ? "noRateAvailable" : "saveFailed");
  }

  async function handleUndo() {
    if (!savedItemId || undoing) return;
    setUndoing(true);
    const result = await undoTextIntake(savedItemId);
    setUndoing(false);
    if (result.ok) {
      setSavedItemId(null);
      refreshAfterIntakeSave();
      setStatus("undone");
      return;
    }
    setStatus(result.reason === "NOT_ALLOWED" ? "undoNotAllowed" : "undoFailed");
  }

  const handleReceiptRef = useRef(handleReceipt);
  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleReceiptRef.current = handleReceipt;
    handleSubmitRef.current = handleSubmit;
  });
  useImperativeHandle(receiveRef, () => ({
    receive(file: File) {
      void handleReceiptRef.current(file);
    },
    receiveText(text: string) {
      setText(text);
      void handleSubmitRef.current(text);
    },
  }), []);

  if (platform !== "web" || !isAiIntakeEnabled()) return null;

  const blocks = buildReplyBlocks(replyState());
  const hasConversation = history.length > 0 || activeUser !== null;

  return (
    <AssistantShell
      open={open}
      onOpenChange={handleOpenChange}
      title={t("aiIntake.title")}
      description={t("aiIntake.emptyDescription")}
      initialFocusRef={textareaRef}
      headerActions={(
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("aiIntake.newChat")}
              disabled={!hasConversation}
              onClick={() => {
                stopRecording();
                clearConversation();
              }}
            >
              <RotateCcw aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("aiIntake.newChat")}</TooltipContent>
        </Tooltip>
      )}
      thinking={checking || (intent === "ask_data" && dataReply === null && !askIntent) || duplicateScan?.status === "pending"}
      onReceipt={(file) => {
        void handleReceipt(file);
      }}
      footer={(
        <AssistantComposer
          value={text}
          onChange={setText}
          textareaRef={textareaRef}
          busyLabel={
            checking
              ? t(`aiIntake.thinking.${pendingPhase ?? "reading"}`)
              : duplicateScan?.status === "pending"
                ? t("aiIntake.thinking.duplicates")
                : intent === "ask_data" && dataReply === null && !askIntent
                  ? t("aiIntake.thinking.data")
                  : undefined
          }
          recording={recording}
          level={level}
          elapsed={elapsed}
          mode={clarification === "amount" ? "amount" : "message"}
          onReceipt={(file) => {
            void handleReceipt(file);
          }}
          onToggleVoice={() => {
            void toggleRecording();
          }}
          onSubmit={() => {
            if (clarification === "amount") handleAmountReply(text);
            else void handleSubmit();
          }}
        />
      )}
    >
      <AssistantThread
        history={history}
        active={activeUser}
        activeBlocks={blocks}
        interactiveActive
        onSuggestion={(suggestion) => {
          void handleSubmit(suggestion);
        }}
        handlers={{
          onChooseIntent: handleChooseIntent,
          onChooseType: handleChooseType,
          onChooseFamily: (family, source) => {
            void loadDataAnswer(source, false, family);
          },
          onSearchDescriptions: (source) => {
            void loadDataAnswer(source, true);
          },
          onChooseRule: setRuleChoice,
          onApproveRule: () => {
            void handleApproveRule();
          },
          onOpenReceipt: () => {
            void openReceiptFile();
          },
          onDateChange: (date) => {
            if (!draft) return;
            const next = { ...draft, date };
            setDraft(next);
            idempotency.current = nextDraftIdempotency(idempotency.current, {
              description: next.description,
              amount: amountInput,
              type: next.type,
              date,
            });
            refreshDuplicates(next, amountInput);
          },
          onDescriptionChange: (description) => {
            if (!draft) return;
            setDraft({ ...draft, description });
            idempotency.current = nextDraftIdempotency(idempotency.current, {
              description,
              amount: amountInput,
              type: draft.type,
              date: draft.date,
            });
          },
          onAmountChange: (amount) => {
            setAmountInput(amount);
            if (!draft) return;
            idempotency.current = nextDraftIdempotency(idempotency.current, {
              description: draft.description,
              amount,
              type: draft.type,
              date: draft.date,
            });
            refreshDuplicates(draft, amount);
          },
          onSave: (choice) => {
            void handleSave(choice);
          },
          onUndo: () => {
            void handleUndo();
          },
          onAskDelete: askDelete,
          onConfirmDelete: (id) => {
            void confirmDelete(id);
          },
          onCancelDelete: () => setConfirmDeleteId(null),
          onDismissPair: (pair) => {
            void dismissPair(pair);
          },
          saving,
          undoing,
          questionCalendar,
        }}
      />
    </AssistantShell>
  );
}
