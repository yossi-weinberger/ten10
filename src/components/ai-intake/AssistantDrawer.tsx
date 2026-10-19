import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import {
  classifyIntent,
  draftFromText,
  type IntakeIntent,
  type TextTransactionDraft,
} from "@/lib/ai/classify-intake";
import { saveTextDraft } from "@/lib/ai/save-text-draft";

interface AssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssistantDrawer({ open, onOpenChange }: AssistantDrawerProps) {
  const { t } = useTranslation("navigation");
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<IntakeIntent | null>(null);
  const [draft, setDraft] = useState<TextTransactionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function handleSubmit() {
    const nextIntent = classifyIntent(text);
    setIntent(nextIntent);
    setDraft(
      nextIntent === "add_transaction"
        ? draftFromText(text, new Intl.DateTimeFormat("en-CA").format(new Date()))
        : null,
    );
    setSaveMessage(null);
  }

  async function handleSave() {
    if (!draft || saving) return;
    setSaving(true);
    setSaveMessage(null);
    const result = await saveTextDraft(draft);
    setSaving(false);
    if (result.ok) {
      setSaveMessage(t("aiIntake.saved"));
      return;
    }
    setSaveMessage(t(result.reason === "NO_RATE" ? "aiIntake.noRateAvailable" : "aiIntake.saveFailed"));
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
              {draft ? (
                <>
                  <p>
                    {t("aiIntake.draftLine", {
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
            </div>
          ) : null}
        </form>
      </DrawerContent>
    </Drawer>
  );
}
