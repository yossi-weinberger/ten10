import { CircleCheck, List } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BASE_TYPE_SURFACE, baseTypeOf } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import type { CurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";
import type { SplitDraft } from "@/lib/ai/split-cards";
import { KIND_TINT } from "./card-style";
import { KindTag } from "./KindTag";
import { TypeChoice } from "./TypeChoice";
import { TypeTag } from "./TypeTag";

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
  const update = (key: string, change: Partial<SplitDraft>) =>
    onChange(cards.map((item) => item.key === key ? { ...item, ...change } : item));
  return (
    <Card className="grid gap-2 p-2.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <KindTag icon={List} tint={KIND_TINT.neutral}>{t("aiIntake.splitCount", { count: cards.length })}</KindTag>
        {dropped > 0 ? <span className="ms-auto text-xs text-muted-foreground">{t("aiIntake.splitUnsure", { count: dropped })}</span> : null}
      </div>
      <ul className="grid gap-1">
        {cards.map((card) => {
          const saved = card.transactionId !== null;
          // A row is tinted by its type, like the add-transaction form. A row without a type stays neutral.
          const surface = card.type ? BASE_TYPE_SURFACE[baseTypeOf(card.type)] : "bg-muted/50";
          return (
            <li key={card.key} className={cn("grid gap-1.5 rounded-md px-2 py-1.5", surface)}>
              {/* The app's checkbox, the row's text as its label; amount and date isolated so RTL keeps their order. */}
              <div className="flex min-w-0 items-center gap-2 text-sm">
                {saved ? (
                  <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <Checkbox
                    id={`ai-split-${card.key}`}
                    className="size-4"
                    checked={card.checked}
                    disabled={!interactive || saving || card.date === null || card.type === null}
                    onCheckedChange={(value) => update(card.key, { checked: value === true })}
                  />
                )}
                <label htmlFor={`ai-split-${card.key}`} className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{card.description || t("aiIntake.splitUntitled")}</span>
                  <span className="text-xs text-muted-foreground">
                    {" · "}
                    <bdi>{card.date ? formatDisplayDate(card.date, "short").primary : t("aiIntake.splitCheckDate")}</bdi>
                    {saved ? <span className="text-success">{` · ${t("aiIntake.saved")}`}</span> : null}
                    {card.type === null && !saved ? ` · ${t("aiIntake.splitAskType")}` : null}
                  </span>
                </label>
                <span className="shrink-0 font-medium tabular-nums">
                  <bdi>{formatCurrency(card.amount, card.currency as CurrencyCode, locale)}</bdi>
                </span>
                {saved ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto shrink-0 px-0 text-xs"
                    disabled={!interactive || saving}
                    onClick={() => onUndo(card.key)}
                  >
                    {t("aiIntake.undo")}
                  </Button>
                ) : card.type ? (
                  <TypeTag
                    type={card.type}
                    variant="compact"
                    disabled={saving}
                    onChange={interactive ? (type) => update(card.key, { type }) : undefined}
                  />
                ) : null}
              </div>
              {card.type === null && !saved ? (
                <div className="ps-6">
                  <TypeChoice
                    receipt={null}
                    compact
                    disabled={!interactive || saving}
                    onChoose={(type: TextTransactionDraft["type"]) => update(card.key, { type, checked: card.date !== null })}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={!interactive || saving || checked === 0} onClick={onSave}>
          {t("aiIntake.splitSave", { count: checked })}
        </Button>
      </div>
    </Card>
  );
}
