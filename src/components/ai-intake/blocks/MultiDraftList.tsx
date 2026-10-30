import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { SplitDraft } from "@/lib/ai/split-cards";
import { TypeChoice } from "./TypeChoice";

export function MultiDraftList({
  cards,
  dropped,
  saving,
  interactive,
  onChange,
  onSave,
  onUndo,
}: {
  cards: SplitDraft[];
  dropped: number;
  saving: boolean;
  interactive: boolean;
  onChange: (cards: SplitDraft[]) => void;
  onSave: () => void;
  onUndo: (key: string) => void;
}) {
  const { t } = useTranslation("navigation");
  const checked = cards.filter((card) => card.checked && card.transactionId === null).length;
  return (
    <div className="grid gap-3">
      {dropped > 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("aiIntake.splitDropped", { found: cards.length, dropped })}
        </p>
      ) : null}
      <ul className="grid gap-2">
        {cards.map((card) => (
          <li key={card.key} className="grid gap-2 rounded-lg border p-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={card.checked}
                disabled={!interactive || saving || card.transactionId !== null || card.date === null || card.type === null}
                onChange={(event) => {
                  onChange(cards.map((item) => item.key === card.key ? { ...item, checked: event.target.checked } : item));
                }}
              />
              <span>
                {card.description || t("aiIntake.splitUntitled")}
                {" · "}
                {card.amount}
                {" "}
                {card.currency}
                {" · "}
                {card.date ?? t("aiIntake.splitCheckDate")}
                {card.type ? ` · ${t(`aiIntake.types.${card.type}`)}` : ""}
              </span>
            </label>
            {card.type === null && card.transactionId === null ? (
              <TypeChoice
                receipt={null}
                disabled={!interactive || saving}
                onChoose={(type: TextTransactionDraft["type"]) => {
                  onChange(cards.map((item) => item.key === card.key ? { ...item, type, checked: item.date !== null } : item));
                }}
              />
            ) : null}
            {card.transactionId !== null ? (
              <Button type="button" size="sm" variant="outline" className="w-fit" disabled={!interactive || saving} onClick={() => onUndo(card.key)}>
                {t("aiIntake.undo")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <Button type="button" size="sm" className="w-fit" disabled={!interactive || saving || checked === 0} onClick={onSave}>
        {t("aiIntake.splitSave", { count: checked })}
      </Button>
    </div>
  );
}
