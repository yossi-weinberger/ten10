import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import type { CurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";
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
  const { t, i18n } = useTranslation("navigation");
  const formatDisplayDate = useDisplayDate();
  const locale = i18n.language.toLowerCase().startsWith("en") ? "en" : "he";
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
          <li key={card.key} className={cn("grid gap-2 rounded-lg border p-3", card.checked && "border-primary/40 bg-primary/5")}>
            {/* The app's checkbox, the whole row as its label; amount and date isolated so RTL keeps their order. */}
            <div className="flex items-start gap-3">
              <Checkbox
                id={`ai-split-${card.key}`}
                className="mt-0.5 size-5"
                checked={card.checked}
                disabled={!interactive || saving || card.transactionId !== null || card.date === null || card.type === null}
                onCheckedChange={(value) => {
                  onChange(cards.map((item) => item.key === card.key ? { ...item, checked: value === true } : item));
                }}
              />
              <label htmlFor={`ai-split-${card.key}`} className="grid min-w-0 flex-1 gap-0.5 text-sm">
                <span className="break-words font-medium">{card.description || t("aiIntake.splitUntitled")}</span>
                <span className="text-xs text-muted-foreground">
                  <bdi>{formatCurrency(card.amount, card.currency as CurrencyCode, locale)}</bdi>
                  {" · "}
                  <bdi>{card.date ? formatDisplayDate(card.date, "numeric").primary : t("aiIntake.splitCheckDate")}</bdi>
                  {card.type ? ` · ${t(`aiIntake.types.${card.type}`)}` : ""}
                </span>
              </label>
            </div>
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
