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
  const [amountReply, setAmountReply] = useState("");
  const [rules, setRules] = useState<ActiveUserRule[]>([]);
  const [parsedRule, setParsedRule] = useState<ParsedUserRule | null>(null);
  const [ruleChoice, setRuleChoice] = useState<RuleActionType | null>(null);
  const [appliedRuleName, setAppliedRuleName] = useState<string | null>(null);
  const [halachaNamespace, setHalachaNamespace] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
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

  async function handleSubmit() {
    let nextIntent = classifyIntent(text);
    if (nextIntent === "out_of_scope" && text.trim()) {
      setChecking(true);
      const decided = await classifyIntentFallback(text);
      setChecking(false);
      if (decided && decided !== "out_of_scope") {
        const page = decided === "domain_adjacent" ? selectHalachaPage(text) : null;
        const rule = decided === "create_rule" ? parseUserRule(text) : null;
        if (decided === "domain_adjacent" && !page) nextIntent = "out_of_scope";
        else if (decided === "create_rule" && !rule) nextIntent = "out_of_scope";
        else nextIntent = decided;
      }
    }
    const today = todayIso();
    const field = nextIntent === "add_transaction" ? clarificationField(text, today) : null;
    setIntent(nextIntent);
    setClarification(field);
    setPendingText(text);
    setChosenType(null);
    setAmountReply("");
    setParsedRule(nextIntent === "create_rule" ? parseUserRule(text) : null);
    setRuleChoice(null);
    setHalachaNamespace(
      nextIntent === "domain_adjacent" ? selectHalachaPage(text)?.namespace ?? null : null,
    );
    showDraft(
      field === null && nextIntent === "add_transaction" ? draftFromText(text, today) : null,
      text,
    );
    setSaveMessage(null);
    setSavedItemId(null);
  }

  function handleChooseType(type: TextTransactionDraft["type"]) {
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
          <Button type="submit" disabled={checking}>{t("aiIntake.send")}</Button>
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
                      date: draft.date,
                      currency: draft.currency,
                      type: t(`aiIntake.types.${draft.type}`),
                      rate: draft.requestedRate ?? t("aiIntake.noRate"),
                    })}
                  </p>
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
