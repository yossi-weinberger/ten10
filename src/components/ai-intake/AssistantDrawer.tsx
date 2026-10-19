import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  applyForwardRule,
  clarificationField,
  classifyIntent,
  draftFromText,
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
import { saveTextDraft } from "@/lib/ai/save-text-draft";
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
import { isIsoDate, receiptAsDraft, receiptRuledDraft, type ReceiptFields } from "@/lib/ai/receipt-card";
import { transcribeSpeech } from "@/lib/ai/transcribe-speech";

interface AssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssistantDrawer({ open, onOpenChange }: AssistantDrawerProps) {
  const { t } = useTranslation([
    "navigation",
    "halacha-expenses",
    "halacha-income",
    "halacha-chomesh",
    "halacha-tithes",
  ]);
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<IntakeIntent | null>(null);
  const [draft, setDraft] = useState<TextTransactionDraft | null>(null);
  const originalDraft = useRef<{ description: string; amount: number } | null>(null);
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
  const [recording, setRecording] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function todayIso(): string {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }

  useEffect(() => {
    if (!open) return;
    void listActiveUserRules().then(setRules);
  }, [open]);

  const duplicateRequest = useRef(0);
  const receiptInput = useRef<HTMLInputElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setAmountInput("");
      setAppliedRuleName(null);
      refreshDuplicates(null, "");
      return;
    }
    const applied = applyForwardRule(next, rules, source);
    setDraft(applied.draft);
    setAmountInput(String(applied.draft.amount));
    originalDraft.current = {
      description: applied.draft.description,
      amount: applied.draft.amount,
    };
    setAppliedRuleName(applied.ruleName);
    refreshDuplicates(applied.draft, String(applied.draft.amount));
  }

  async function handleReceipt(file: File | undefined) {
    if (!file || checking) return;
    setChecking(true);
    setSaveMessage(null);
    const result = await readReceiptImage(file);
    setChecking(false);
    if (receiptInput.current) receiptInput.current.value = "";
    if (!result.ok) {
      setIntent(null);
      setReceiptFields(null);
      showDraft(null, "");
      setSaveMessage(t(result.reason === "TOO_LARGE" ? "aiIntake.receiptTooLarge" : "aiIntake.receiptUnreadable"));
      return;
    }
    setIntent("add_transaction");
    setPendingText("");
    setChosenType(null);
    setAmountReply("");
    setParsedRule(null);
    setRuleChoice(null);
    setHalachaNamespace(null);
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
    setChecking(true);
    const heard = await transcribeSpeech(blob);
    setChecking(false);
    if (!heard.ok) {
      setSaveMessage(t(heard.reason === "TOO_LONG" ? "aiIntake.voiceTooLong" : "aiIntake.voiceUnheard"));
      return;
    }
    setText(heard.text);
    await handleSubmit(heard.text);
  }

  async function toggleRecording() {
    if (checking) return;
    const active = recorder.current;
    if (active && active.state !== "inactive") {
      active.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setSaveMessage(t("aiIntake.voiceDenied"));
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setSaveMessage(t("aiIntake.voiceDenied"));
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
      if (recordTimer.current) clearTimeout(recordTimer.current);
      recorder.current = null;
      setRecording(false);
      void finishVoice(new Blob(chunks, { type: media.mimeType || "audio/webm" }));
    };
    media.start();
    setRecording(true);
    setSaveMessage(null);
    recordTimer.current = setTimeout(() => {
      if (media.state !== "inactive") media.stop();
    }, 60_000);
  }

  async function handleSubmit(spoken?: string) {
    const source = spoken ?? text;
    let nextIntent = classifyIntent(source);
    if (nextIntent === "out_of_scope" && source.trim()) {
      setChecking(true);
      const decided = await classifyIntentFallback(source);
      setChecking(false);
      if (decided && decided !== "out_of_scope") {
        const page = decided === "domain_adjacent" ? selectHalachaPage(source) : null;
        const rule = decided === "create_rule" ? parseUserRule(source) : null;
        if (decided === "domain_adjacent" && !page) nextIntent = "out_of_scope";
        else if (decided === "create_rule" && !rule) nextIntent = "out_of_scope";
        else nextIntent = decided;
      }
    }
    const today = todayIso();
    const field = nextIntent === "add_transaction" ? clarificationField(source, today) : null;
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
    setSaveMessage(null);
    setSavedItemId(null);
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

  function handleAmountReply() {
    const source = `${pendingText} ${amountReply}`;
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
      setSaveMessage(t("aiIntake.ruleFailed"));
      return;
    }
    setRules((current) => [...current, { name: parsedRule.name, type }]);
    setParsedRule(null);
    setRuleChoice(null);
    setSaveMessage(t("aiIntake.ruleSaved"));
  }

  async function handleSave(choice?: "saved_anyway" | "same_event") {
    if (!draft || saving) return;
    if (!isIsoDate(draft.date)) {
      setSaveMessage(t("aiIntake.editDateInvalid"));
      return;
    }
    const amount = Number(amountInput.replace(",", "."));
    if (!Number.isFinite(amount) || amount === 0) {
      setSaveMessage(t("aiIntake.editAmountInvalid"));
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    const result = await saveTextDraft(
      { ...draft, amount },
      originalDraft.current ?? { description: draft.description, amount },
      duplicates.length > 0 && choice
        ? { choice, candidateIds: duplicates.map((row) => row.id) }
        : undefined,
    );
    setSaving(false);
    if (result.ok && result.sameEvent) {
      setSaveMessage(t("aiIntake.duplicateKept"));
      return;
    }
    if (result.ok) {
      void recordShadowType(result.itemId, chosenType !== null);
      setSavedItemId(result.itemId);
      refreshAfterIntakeSave();
      setSaveMessage(t("aiIntake.saved"));
      return;
    }
    setSaveMessage(t(result.reason === "NO_RATE" ? "aiIntake.noRateAvailable" : "aiIntake.saveFailed"));
  }

  async function handleUndo() {
    if (!savedItemId || undoing) return;
    setUndoing(true);
    const result = await undoTextIntake(savedItemId);
    setUndoing(false);
    if (result.ok) {
      setSavedItemId(null);
      refreshAfterIntakeSave();
      setSaveMessage(t("aiIntake.undone"));
      return;
    }
    setSaveMessage(
      t(result.reason === "NOT_ALLOWED" ? "aiIntake.undoNotAllowed" : "aiIntake.undoFailed"),
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t("aiIntake.title")}</DrawerTitle>
        </DrawerHeader>
        <form
          className="flex flex-col gap-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (clarification === "amount") {
              handleAmountReply();
              return;
            }
            void handleSubmit();
          }}
        >
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("aiIntake.placeholder")}
            aria-label={t("aiIntake.placeholder")}
          />
          <Button type="submit" disabled={checking || recording}>{t("aiIntake.send")}</Button>
          <input
            ref={receiptInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(event) => {
              void handleReceipt(event.target.files?.[0]);
            }}
          />
          <Button type="button" disabled={checking || recording} onClick={() => receiptInput.current?.click()}>
            {t("aiIntake.receipt")}
          </Button>
          <Button type="button" disabled={checking} onClick={() => void toggleRecording()}>
            {t(recording ? "aiIntake.voiceStop" : "aiIntake.voice")}
          </Button>
          {checking ? <p>{t("aiIntake.checking")}</p> : null}
          {intent ? (
            <div className="flex flex-col gap-1 text-sm">
              <p>
                {t(`aiIntake.intents.${intent}`)} {saveMessage ? "" : t("aiIntake.notSaved")}
              </p>
              {halachaNamespace ? (
                <div className="flex flex-col gap-2">
                  <p>{t("introduction.body", { ns: halachaNamespace })}</p>
                  <p>{t("aiIntake.halachaDisclaimer")}</p>
                  <Link to="/halacha" className="text-sm underline">
                    {t("aiIntake.halachaLink")}
                  </Link>
                </div>
              ) : null}
              {parsedRule ? (
                <div className="flex flex-col gap-2">
                  {parsedRule.action === "ambiguous" && !ruleChoice ? (
                    <>
                      <p>{t("aiIntake.askRule")}</p>
                      <div className="flex flex-wrap gap-2">
                        {(["exempt-income", "recognized-expense", "non_tithe_donation"] as const).map((type) => (
                          <Button key={type} type="button" onClick={() => setRuleChoice(type)}>
                            {t(`aiIntake.types.${type}`)}
                          </Button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <p>
                        {t("aiIntake.ruleSentence", {
                          name: parsedRule.name,
                          type: t(`aiIntake.types.${ruleChoice ?? parsedRule.action}`),
                        })}
                      </p>
                      <Button type="button" disabled={saving} onClick={() => void handleApproveRule()}>
                        {t("aiIntake.ruleApprove")}
                      </Button>
                    </>
                  )}
                </div>
              ) : null}
              {clarification === "type" ? (
                <div className="flex flex-col gap-2">
                  <p>{t("aiIntake.askType")}</p>
                  {receiptFields ? (
                    <p>
                      {t("aiIntake.receiptPreview", {
                        description: receiptFields.description,
                        date: receiptFields.date,
                        amount: receiptFields.amount,
                        currency: receiptFields.currency,
                      })}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {(["expense", "income", "donation"] as const).map((type) => (
                      <Button key={type} type="button" onClick={() => handleChooseType(type)}>
                        {t(`aiIntake.types.${type}`)}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {clarification === "amount" ? (
                <div className="flex flex-col gap-2">
                  <p>{t("aiIntake.askAmount")}</p>
                  <Input
                    value={amountReply}
                    onChange={(event) => setAmountReply(event.target.value)}
                    inputMode="decimal"
                    aria-label={t("aiIntake.askAmount")}
                  />
                  <Button type="button" onClick={handleAmountReply}>
                    {t("aiIntake.continue")}
                  </Button>
                </div>
              ) : null}
              {draft ? (
                <>
                  <p>
                    {t("aiIntake.draftMeta", {
                      currency: draft.currency,
                      type: t(`aiIntake.types.${draft.type}`),
                      rate: draft.requestedRate ?? t("aiIntake.noRate"),
                    })}
                  </p>
                  <Input
                    type="date"
                    value={draft.date}
                    aria-label={t("aiIntake.editDate")}
                    onChange={(event) => {
                      const next = { ...draft, date: event.target.value };
                      setDraft(next);
                      refreshDuplicates(next, amountInput);
                    }}
                  />
                  <Input
                    value={draft.description}
                    aria-label={t("aiIntake.editDescription")}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                  />
                  <Input
                    value={amountInput}
                    inputMode="decimal"
                    aria-label={t("aiIntake.editAmount")}
                    onChange={(event) => {
                      setAmountInput(event.target.value);
                      refreshDuplicates(draft, event.target.value);
                    }}
                  />
                  {appliedRuleName ? (
                    <p>{t("aiIntake.ruleApplied", { name: appliedRuleName })}</p>
                  ) : null}
                  {duplicates.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <p>{t("aiIntake.duplicateWarning", { count: duplicates.length })}</p>
                      {duplicatesRanked ? <p>{t("aiIntake.duplicateRanked")}</p> : null}
                      {duplicates.slice(0, 3).map((row) => (
                        <p key={row.id}>
                          {row.date} · {row.amount}
                          {row.description ? ` · ${row.description}` : ""}
                          {row.kind === "draft" ? ` · ${t("aiIntake.draftCandidate")}` : ""}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave(duplicates.length > 0 ? "saved_anyway" : undefined)}
                  >
                    {t(duplicates.length > 0 ? "aiIntake.saveAnyway" : "aiIntake.save")}
                  </Button>
                  {duplicates.length > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void handleSave("same_event")}
                    >
                      {t("aiIntake.sameEvent")}
                    </Button>
                  ) : null}
                </>
              ) : null}
              {saveMessage ? <p>{saveMessage}</p> : null}
              {savedItemId ? (
                <Button type="button" disabled={undoing} onClick={() => void handleUndo()}>
                  {t("aiIntake.undo")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </form>
      </DrawerContent>
    </Drawer>
  );
}
