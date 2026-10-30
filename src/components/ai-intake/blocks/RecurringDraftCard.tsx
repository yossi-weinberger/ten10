import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import {
  RECURRING_EDIT_FIELDS,
  nextRecurringQuestion,
  recurringCancelOpen,
  recurringCardReady,
  recurringShortDate,
  saveStartDate,
  recurringSummaryPieces,
  unsupportedRecurringFrequency,
  upcomingRecurringDates,
  withRecurringDay,
  withRecurringFrequency,
  withRecurringStart,
  type RecurringCard,
  type RecurringEditField,
  type RecurringQuestion,
} from "@/lib/ai/recurring-card";
import { ChoiceRow } from "./ChoiceRow";
import { TypeChoice } from "./TypeChoice";

const CURRENCIES = ["ILS", "USD", "EUR"] as const;
const TYPES = ["expense", "income", "donation", "exempt-income", "recognized-expense", "non_tithe_donation"] as const;
const CATEGORIES = ["food", "transportation"] as const;

const fieldClass = "border-input bg-background h-9 w-full rounded-md border ps-3 pe-10 text-sm rtl:ps-10 rtl:pe-3";

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function currencySymbol(currency: RecurringCard["currency"]): string {
  if (currency === "ILS") return "₪";
  if (currency === "USD") return "$";
  if (currency === "EUR") return "€";
  return currency ?? "";
}

function fieldLabelKey(field: RecurringEditField | "amount"): string {
  switch (field) {
    case "amount":
      return "aiIntake.editAmount";
    case "description":
      return "aiIntake.editDescription";
    case "currency":
    case "type":
    case "recipient":
    case "category":
    case "day":
    case "start":
    case "count":
      return `aiIntake.recurring.${field}`;
    default: {
      const never: never = field;
      return never;
    }
  }
}

export function RecurringDraftCard({
  card,
  saving,
  interactive,
  onChange,
  onSave,
  onDismiss,
  onCancel,
}: {
  card: RecurringCard;
  saving: boolean;
  interactive: boolean;
  onChange: (card: RecurringCard) => void;
  onSave: () => void;
  onDismiss: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("navigation");
  const formatDisplayDate = useDisplayDate();
  const [openField, setOpenField] = useState<RecurringEditField | null>(null);
  const [picking, setPicking] = useState(false);
  const today = todayIso();
  const locked = !interactive || card.saved || saving;
  const start = saveStartDate(card, today);
  const dates = upcomingRecurringDates(card, today);
  const ready = recurringCardReady(card, today);
  const question = nextRecurringQuestion(card);
  const blocked = unsupportedRecurringFrequency(card.frequency);
  const showSummary = !blocked && question === null;
  const cancelOpen = card.saved
    && !card.cancelled
    && card.savedCreatedAt !== null
    && recurringCancelOpen(card.savedCreatedAt, card.executionCount, new Date());
  const labels = {
    type: card.type ? t(`aiIntake.types.${card.type}`) : "",
    currency: currencySymbol(card.currency),
    start: start ? recurringShortDate(start, card.calendarType) : "",
    lead: t("aiIntake.recurring.summaryLead"),
    payeePrefix: t("aiIntake.recurring.summaryPayee"),
    monthly: t("aiIntake.recurring.summaryMonthly"),
    from: t("aiIntake.recurring.summaryFrom"),
  };

  function openOne(field: RecurringEditField) {
    setPicking(false);
    setOpenField(field);
  }

  const summary = (
    <p className="text-sm">
      {recurringSummaryPieces(card, labels).map((piece, index) => {
        if (piece.field === null || card.saved || locked) {
          return <span key={index}>{piece.text}</span>;
        }
        const field = piece.field;
        return (
          <button
            key={index}
            type="button"
            className="underline decoration-dotted underline-offset-4"
            onClick={() => openOne(field)}
          >
            {piece.text}
          </button>
        );
      })}
    </p>
  );

  const dateList = dates.length > 0 ? (
    <ul className="grid gap-1 text-sm text-muted-foreground">
      {dates.map((date) => (
        <li key={date}>{formatDisplayDate(date, "numeric").primary}</li>
      ))}
    </ul>
  ) : null;

  if (card.saved) {
    return (
      <div className="grid gap-3 rounded-lg border p-3">
        {summary}
        {dateList}
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="w-fit">
            <Link to="/transactions-table/recurring-transactions">{t("aiIntake.recurring.openTable")}</Link>
          </Button>
          {cancelOpen ? (
            <Button type="button" variant="outline" size="sm" disabled={!interactive || saving} onClick={onCancel}>
              {t("aiIntake.recurring.cancel")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="grid gap-3 rounded-lg border p-3">
        <p className="text-sm">{t("aiIntake.recurring.monthlyOnly")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={locked}
            onClick={() => onChange(withRecurringFrequency(card, "monthly"))}
          >
            {t("aiIntake.recurring.makeMonthly")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={locked} onClick={onDismiss}>
            {t("aiIntake.recurring.decline")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      {showSummary ? summary : null}
      {showSummary ? dateList : null}
      {question && !openField && !picking ? (
        <Question
          card={card}
          question={question}
          disabled={locked}
          today={today}
          onChange={onChange}
          onDismiss={onDismiss}
        />
      ) : null}
      {picking ? (
        <ChoiceRow
          prompt={t("aiIntake.recurring.changeDetail")}
          options={RECURRING_EDIT_FIELDS.map((field) => ({
            value: field,
            label: t(fieldLabelKey(field)),
          }))}
          disabled={locked}
          onChoose={openOne}
        />
      ) : null}
      {openField ? (
        <div className="grid gap-2">
          <FieldControl field={openField} card={card} disabled={locked} today={today} onChange={onChange} />
          <Button type="button" size="sm" variant="outline" className="w-fit" disabled={locked} onClick={() => setOpenField(null)}>
            {t("aiIntake.recurring.done")}
          </Button>
        </div>
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
      {card.includeThisMonth === "yes" && !card.monthDuplicate && showSummary && start !== null && start >= today ? (
        <p className="text-sm text-muted-foreground">{t("aiIntake.recurring.appearsTomorrow")}</p>
      ) : null}
      {showSummary && !openField && !picking ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={locked || !ready} onClick={onSave}>
            {t("aiIntake.recurring.save")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={locked} onClick={() => setPicking(true)}>
            {t("aiIntake.recurring.changeDetail")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Question({
  card,
  question,
  disabled,
  today,
  onChange,
  onDismiss,
}: {
  card: RecurringCard;
  question: RecurringQuestion;
  disabled: boolean;
  today: string;
  onChange: (card: RecurringCard) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation("navigation");
  const leave = (
    <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={onDismiss}>
      {t("aiIntake.recurring.notNow")}
    </Button>
  );

  switch (question) {
    case "amount":
      return (
        <AmountAsk
          initial={card.amount}
          disabled={disabled}
          onCommit={(amount) => onChange({ ...card, amount })}
          extra={leave}
        />
      );
    case "currency":
      return (
        <div className="grid gap-2">
          <ChoiceRow
            prompt={t("aiIntake.recurring.askCurrency")}
            disabled={disabled}
            options={CURRENCIES.map((currency) => ({ value: currency, label: currency }))}
            onChoose={(currency) => onChange({ ...card, currency })}
          />
          {leave}
        </div>
      );
    case "type":
      return (
        <div className="grid gap-2">
          <TypeChoice receipt={null} disabled={disabled} onChoose={(type) => onChange({ ...card, type })} />
          {leave}
        </div>
      );
    case "frequency":
      return (
        <div className="grid gap-2">
          <ChoiceRow
            prompt={t("aiIntake.recurring.askMonthly")}
            disabled={disabled}
            options={[{ value: "monthly", label: t("aiIntake.recurring.frequencies.monthly") }]}
            onChoose={() => onChange(withRecurringFrequency(card, "monthly"))}
          />
          {leave}
        </div>
      );
    case "day":
      return (
        <DayAsk
          disabled={disabled}
          onCommit={(day) => onChange(withRecurringDay(card, day, today))}
          extra={leave}
        />
      );
    case "includeThisMonth":
      return (
        <div className="grid gap-2">
          <p className="text-sm">{t("aiIntake.recurring.includeThisMonth")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={disabled}
              onClick={() => onChange({ ...card, includeThisMonth: "yes", monthDuplicate: false })}
            >
              {t("aiIntake.recurring.includeYes")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onChange({ ...card, includeThisMonth: "no", monthDuplicate: false })}
            >
              {t("aiIntake.recurring.includeNo")}
            </Button>
            {leave}
          </div>
        </div>
      );
    default: {
      const never: never = question;
      return never;
    }
  }
}

function AmountAsk({
  initial,
  disabled,
  onCommit,
  extra,
}: {
  initial: number | null;
  disabled: boolean;
  onCommit: (amount: number) => void;
  extra: ReactNode;
}) {
  const { t } = useTranslation("navigation");
  const [draft, setDraft] = useState(initial === null ? "" : String(initial));
  const amount = Number(draft);
  const valid = draft !== "" && Number.isFinite(amount) && amount > 0;
  return (
    <div className="grid gap-2">
      <Label>{t("aiIntake.recurring.askAmount")}</Label>
      <Input
        aria-label={t("aiIntake.editAmount")}
        inputMode="decimal"
        disabled={disabled}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={disabled || !valid} onClick={() => onCommit(amount)}>
          {t("aiIntake.recurring.continue")}
        </Button>
        {extra}
      </div>
    </div>
  );
}

function DayAsk({
  disabled,
  onCommit,
  extra,
}: {
  disabled: boolean;
  onCommit: (day: number) => void;
  extra: ReactNode;
}) {
  const { t } = useTranslation("navigation");
  const [draft, setDraft] = useState("");
  const day = Number(draft);
  const valid = Number.isInteger(day) && day >= 1 && day <= 31;
  return (
    <div className="grid gap-2">
      <Label>{t("aiIntake.recurring.askDay")}</Label>
      <Input
        aria-label={t("aiIntake.recurring.day")}
        inputMode="numeric"
        disabled={disabled}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={disabled || !valid} onClick={() => onCommit(day)}>
          {t("aiIntake.recurring.continue")}
        </Button>
        {extra}
      </div>
    </div>
  );
}

function FieldControl({
  field,
  card,
  disabled,
  today,
  onChange,
}: {
  field: RecurringEditField;
  card: RecurringCard;
  disabled: boolean;
  today: string;
  onChange: (card: RecurringCard) => void;
}) {
  const { t } = useTranslation("navigation");
  switch (field) {
    case "amount":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.editAmount")}</Label>
          <Input
            aria-label={t("aiIntake.editAmount")}
            inputMode="decimal"
            disabled={disabled}
            value={card.amount ?? ""}
            onChange={(event) => {
              const amount = Number(event.target.value);
              onChange({ ...card, amount: Number.isFinite(amount) && event.target.value !== "" ? amount : null });
            }}
          />
        </div>
      );
    case "currency":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.currency")}</Label>
          <select
            aria-label={t("aiIntake.recurring.currency")}
            className={fieldClass}
            disabled={disabled}
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
      );
    case "type":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.type")}</Label>
          <select
            aria-label={t("aiIntake.recurring.type")}
            className={fieldClass}
            disabled={disabled}
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
      );
    case "description":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.editDescription")}</Label>
          <Input
            aria-label={t("aiIntake.editDescription")}
            disabled={disabled}
            value={card.description}
            onChange={(event) => onChange({ ...card, description: event.target.value })}
          />
        </div>
      );
    case "recipient":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.recipient")}</Label>
          <Input
            aria-label={t("aiIntake.recurring.recipient")}
            disabled={disabled}
            value={card.recipient}
            onChange={(event) => onChange({ ...card, recipient: event.target.value })}
          />
        </div>
      );
    case "category":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.category")}</Label>
          <select
            aria-label={t("aiIntake.recurring.category")}
            className={fieldClass}
            disabled={disabled}
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
      );
    case "day":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.day")}</Label>
          <Input
            aria-label={t("aiIntake.recurring.day")}
            inputMode="numeric"
            disabled={disabled}
            value={card.dayOfMonth ?? ""}
            onChange={(event) => {
              const day = Number(event.target.value);
              if (!Number.isInteger(day) || day < 1 || day > 31) return;
              onChange(withRecurringDay(card, day, today));
            }}
          />
        </div>
      );
    case "start":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.start")}</Label>
          <Input
            aria-label={t("aiIntake.recurring.start")}
            type="date"
            disabled={disabled}
            value={card.startDate ?? ""}
            onChange={(event) => {
              if (event.target.value) onChange(withRecurringStart(card, event.target.value));
            }}
          />
        </div>
      );
    case "count":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.count")}</Label>
          <Input
            aria-label={t("aiIntake.recurring.count")}
            inputMode="numeric"
            disabled={disabled}
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
      );
    default: {
      const never: never = field;
      return never;
    }
  }
}
