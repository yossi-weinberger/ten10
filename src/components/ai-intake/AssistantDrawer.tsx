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

interface AssistantDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssistantDrawer({ open, onOpenChange }: AssistantDrawerProps) {
  const { t } = useTranslation("navigation");
  const [text, setText] = useState("");
  const [intent, setIntent] = useState<IntakeIntent | null>(null);
  const [draft, setDraft] = useState<TextTransactionDraft | null>(null);

  function handleSubmit() {
    const nextIntent = classifyIntent(text);
    setIntent(nextIntent);
    setDraft(
      nextIntent === "add_transaction"
        ? draftFromText(text, new Intl.DateTimeFormat("en-CA").format(new Date()))
        : null,
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
                {t(`aiIntake.intents.${intent}`)} {t("aiIntake.notSaved")}
              </p>
              {draft ? (
                <p>
                  {t("aiIntake.draftLine", {
                    date: draft.date,
                    amount: draft.amount,
                    currency: draft.currency,
                    type: t(`aiIntake.types.${draft.type}`),
                    rate: draft.requestedRate ?? t("aiIntake.noRate"),
                  })}
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      </DrawerContent>
    </Drawer>
  );
}
