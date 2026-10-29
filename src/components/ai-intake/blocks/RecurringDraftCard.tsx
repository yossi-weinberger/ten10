import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import type { RecurrenceFrequency } from "@/lib/calendar";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import {
  recurringCardReady,
  upcomingRecurringDates,
  withRecurringDay,
  withRecurringFrequency,
  withRecurringStart,
  type RecurringCard,
} from "@/lib/ai/recurring-card";

const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
const CURRENCIES = ["ILS", "USD", "EUR"] as const;
const TYPES = ["expense", "income", "donation", "exempt-income", "recognized-expense", "non_tithe_donation"] as const;
const CATEGORIES = ["food", "transportation"] as const;

const fieldClass = "border-input bg-background h-9 w-full rounded-md border ps-3 pe-10 text-sm rtl:ps-10 rtl:pe-3";

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export function RecurringDraftCard({
  card,
  saving,
  interactive,
  onChange,
  onSave,
  onDismiss,
}: {
  card: RecurringCard;
  saving: boolean;
  interactive: boolean;
  onChange: (card: RecurringCard) => void;
  onSave: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation("navigation");
  const formatDisplayDate = useDisplayDate();
  const today = todayIso();
  const locked = !interactive || card.saved || saving;
  const dates = upcomingRecurringDates(card);
  const ready = recurringCardReady(card, today);
  const end = card.totalOccurrences === null
    ? t("aiIntake.recurring.openEnded")
    : t("aiIntake.recurring.occurrences", { count: card.totalOccurrences });

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <p className="text-sm">
        {[
          card.amount !== null && card.currency ? `${card.amount} ${card.currency}` : null,
          card.description || null,
          card.type ? t(`aiIntake.types.${card.type}`) : null,
          card.frequency ? t(`aiIntake.recurring.frequencies.${card.frequency}`) : null,
          card.dayOfMonth !== null ? t("aiIntake.recurring.onDay", { day: card.dayOfMonth }) : null,
          end,
        ].filter((part) => part !== null).join(", ")}
      </p>
      {dates.length > 0 ? (
        <ul className="grid gap-1 text-sm text-muted-foreground">
          {dates.map((date) => (
            <li key={date}>{formatDisplayDate(date, "numeric").primary}</li>
          ))}
        </ul>
      ) : null}
      {card.saved ? (
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to="/transactions-table/recurring-transactions">{t("aiIntake.recurring.openTable")}</Link>
        </Button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <Label>{t("aiIntake.editAmount")}</Label>
            <Input
              aria-label={t("aiIntake.editAmount")}
              inputMode="decimal"
              disabled={locked}
              value={card.amount ?? ""}
              onChange={(event) => {
                const amount = Number(event.target.value);
                onChange({ ...card, amount: Number.isFinite(amount) && event.target.value !== "" ? amount : null });
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.recurring.currency")}</Label>
            <select
              aria-label={t("aiIntake.recurring.currency")}
              className={fieldClass}
              disabled={locked}
              value={card.currency ?? ""}
              onChange={(event) => onChange({
                ...card,
                currency: event.target.value === "" ? null : event.target.value as TextTransactionDraft["currency"],
              })}
            >
              <option value="" />
              {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.recurring.type")}</Label>
            <select
              aria-label={t("aiIntake.recurring.type")}
              className={fieldClass}
              disabled={locked}
              value={card.type ?? ""}
              onChange={(event) => onChange({
                ...card,
                type: event.target.value === "" ? null : event.target.value as TextTransactionDraft["type"],
              })}
            >
              <option value="" />
              {TYPES.map((type) => (
                <option key={type} value={type}>{t(`aiIntake.types.${type}`)}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.recurring.frequency")}</Label>
            <select
              aria-label={t("aiIntake.recurring.frequency")}
              className={fieldClass}
              disabled={locked}
              value={card.frequency ?? ""}
              onChange={(event) => {
                if (event.target.value === "") {
                  onChange({ ...card, frequency: null, monthDuplicate: false });
                  return;
                }
                onChange(withRecurringFrequency(card, event.target.value as RecurrenceFrequency));
              }}
            >
              <option value="" />
              {FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>{t(`aiIntake.recurring.frequencies.${frequency}`)}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.recurring.recipient")}</Label>
            <Input
              aria-label={t("aiIntake.recurring.recipient")}
              disabled={locked}
              value={card.recipient}
              onChange={(event) => onChange({ ...card, recipient: event.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.editDescription")}</Label>
            <Input
              aria-label={t("aiIntake.editDescription")}
              disabled={locked}
              value={card.description}
              onChange={(event) => onChange({ ...card, description: event.target.value })}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.recurring.category")}</Label>
            <select
              aria-label={t("aiIntake.recurring.category")}
              className={fieldClass}
              disabled={locked}
              value={card.category ?? ""}
              onChange={(event) => onChange({
                ...card,
                category: event.target.value === "" ? null : event.target.value as TextTransactionDraft["category"],
              })}
            >
              <option value="" />
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{t(`aiIntake.recurring.categories.${category}`)}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.recurring.day")}</Label>
            <Input
              aria-label={t("aiIntake.recurring.day")}
              inputMode="numeric"
              disabled={locked}
              value={card.dayOfMonth ?? ""}
              onChange={(event) => {
                const day = Number(event.target.value);
                if (!Number.isInteger(day) || day < 1 || day > 31) return;
                onChange(withRecurringDay(card, day, today));
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.recurring.start")}</Label>
            <Input
              aria-label={t("aiIntake.recurring.start")}
              type="date"
              disabled={locked}
              value={card.startDate ?? ""}
              onChange={(event) => {
                if (event.target.value) onChange(withRecurringStart(card, event.target.value));
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label>{t("aiIntake.recurring.count")}</Label>
            <Input
              aria-label={t("aiIntake.recurring.count")}
              inputMode="numeric"
              disabled={locked}
              value={card.totalOccurrences ?? ""}
              placeholder={t("aiIntake.recurring.openEnded")}
              onChange={(event) => {
                if (event.target.value === "") {
                  onChange({ ...card, totalOccurrences: null });
                  return;
                }
                const count = Number(event.target.value);
                if (Number.isInteger(count) && count > 0) onChange({ ...card, totalOccurrences: count });
              }}
            />
          </div>
        </div>
      )}
      {card.alreadyCharged && !card.saved ? (
        <div className="grid gap-2">
          <p className="text-sm">{t("aiIntake.recurring.includeThisMonth")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={card.includeThisMonth === "yes" ? "default" : "outline"}
              disabled={locked}
              onClick={() => onChange({ ...card, includeThisMonth: "yes", monthDuplicate: false })}
            >
              {t("aiIntake.recurring.includeYes")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={card.includeThisMonth === "no" ? "default" : "outline"}
              disabled={locked}
              onClick={() => onChange({ ...card, includeThisMonth: "no", monthDuplicate: false })}
            >
              {t("aiIntake.recurring.includeNo")}
            </Button>
          </div>
          {card.includeThisMonth === "yes" && !card.monthDuplicate ? (
            <p className="text-sm text-muted-foreground">{t("aiIntake.recurring.appearsTomorrow")}</p>
          ) : null}
          {card.monthDuplicate ? (
            <div className="grid gap-2">
              <p className="text-sm">{t("aiIntake.recurring.alreadyRecorded")}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit"
                disabled={locked}
                onClick={() => onChange({ ...card, includeThisMonth: "no", monthDuplicate: false })}
              >
                {t("aiIntake.recurring.nextMonthOnly")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {card.saved ? null : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={locked || !ready} onClick={onSave}>
            {t("aiIntake.recurring.save")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={locked} onClick={onDismiss}>
            {t("aiIntake.recurring.notNow")}
          </Button>
        </div>
      )}
    </div>
  );
}
