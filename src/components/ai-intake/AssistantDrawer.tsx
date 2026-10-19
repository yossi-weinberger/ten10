import { useState } from "react";
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
  clarificationField,
  classifyIntent,
  draftFromText,
  type ClarificationField,
  type IntakeIntent,
  type TextTransactionDraft,
} from "@/lib/ai/classify-intake";
import { refreshAfterIntakeSave } from "@/lib/ai/refresh-after-intake";
import { saveTextDraft } from "@/lib/ai/save-text-draft";
import { undoTextIntake } from "@/lib/ai/undo-text-intake";

interface AssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssistantDrawer({ open, onOpenChange }: AssistantDrawerProps) {
  const { t } = useTranslation("navigation");
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<IntakeIntent | null>(null);
  const [draft, setDraft] = useState<TextTransactionDraft | null>(null);
  const [clarification, setClarification] = useState<ClarificationField | null>(null);
  const [pendingText, setPendingText] = useState("");
  const [chosenType, setChosenType] = useState<TextTransactionDraft["type"] | null>(null);
  const [amountReply, setAmountReply] = useState("");
  const [saving, setSaving] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [savedItemId, setSavedItemId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function todayIso(): string {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }

  function handleSubmit() {
    const nextIntent = classifyIntent(text);
    const today = todayIso();
    const field = nextIntent === "add_transaction" ? clarificationField(text, today) : null;
    setIntent(nextIntent);
    setClarification(field);
    setPendingText(text);
    setChosenType(null);
    setAmountReply("");
    setDraft(
      field === null && nextIntent === "add_transaction" ? draftFromText(text, today) : null,
    );
    setSaveMessage(null);
    setSavedItemId(null);
  }

  function handleChooseType(type: TextTransactionDraft["type"]) {
    const next = draftFromText(pendingText, todayIso());
    setChosenType(type);
    if (next) {
      setDraft({ ...next, type });
      setClarification(null);
      return;
    }
    setDraft(null);
    setClarification("amount");
  }

  function handleAmountReply() {
    const next = draftFromText(`${pendingText} ${amountReply}`, todayIso());
    if (!next) return;
    setDraft(chosenType ? { ...next, type: chosenType } : next);
    setClarification(null);
  }

  async function handleSave() {
    if (!draft || saving) return;
    setSaving(true);
    setSaveMessage(null);
    const result = await saveTextDraft(draft);
    setSaving(false);
    if (result.ok) {
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
            handleSubmit();
          }}
        >
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("aiIntake.placeholder")}
            aria-label={t("aiIntake.placeholder")}
          />
          <Button type="submit">{t("aiIntake.send")}</Button>
          {intent ? (
            <div className="flex flex-col gap-1 text-sm">
              <p>
                {t(`aiIntake.intents.${intent}`)} {saveMessage ? "" : t("aiIntake.notSaved")}
              </p>
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
                    {t("aiIntake.draftLine", {
                      description: draft.description,
                      date: draft.date,
                      amount: draft.amount,
                      currency: draft.currency,
                      type: t(`aiIntake.types.${draft.type}`),
                      rate: draft.requestedRate ?? t("aiIntake.noRate"),
                    })}
                  </p>
                  <Button type="button" disabled={saving} onClick={() => void handleSave()}>
                    {t("aiIntake.save")}
                  </Button>
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
