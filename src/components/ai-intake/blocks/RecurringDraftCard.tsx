import { useState, type ReactNode } from "react";
import { Repeat } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { getCurrencySymbol, type CurrencyCode } from "@/lib/currencies";
import { formatLocalDate, getCurrentLocalDate, parseLocalDate } from "@/lib/utils/local-date";
import { formatCurrency } from "@/lib/utils/currency";
import { parseDraftAmount } from "@/lib/ai/draft-amount";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { SUPPORTED_CURRENCY_CODES } from "../../../../supabase/functions/_shared/transaction-domain/normalize-core.ts";
import {
  EXPENSE_CATEGORY_KEYS,
  INCOME_CATEGORY_KEYS,
  isPredefinedCategory,
} from "../../../../supabase/functions/_shared/transaction-domain/category-keys.ts";
import {
  RECURRING_EDIT_FIELDS,
  maxRecurringDay,
  nextRecurringQuestion,
  recurringCancelOpen,
  recurringCardReady,
  recurringTotalOccurrences,
  saveStartDate,
  unsupportedRecurringFrequency,
  upcomingRecurringDates,
  withRecurringDay,
  withRecurringFrequency,
  withRecurringStart,
  type RecurringCard,
  type RecurringEditField,
  type RecurringQuestion,
} from "@/lib/ai/recurring-card";
import { useDonationStore } from "@/lib/store";
import { BASE_TYPE_SURFACE, baseTypeOf } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils";
import { ChoiceRow } from "./ChoiceRow";
import { ChomeshToggle } from "./ChomeshToggle";
import { SavedLine, type SavedFooter } from "./SavedLine";
import { TypeTag } from "./TypeTag";
import { TypeChoice } from "./TypeChoice";

const CURRENCIES = SUPPORTED_CURRENCY_CODES;
const TYPES = ["expense", "income", "donation", "exempt-income", "recognized-expense", "non_tithe_donation"] as const;
/** The payment methods a draft can carry. Labels come from the form's translations. */
const PAYMENT_METHODS = ["credit_card", "cash", "bank_transfer", "bit_paybox", "check"] as const;

/** The form's predefined categories for the card's type. A donation has no category. */
function categoriesFor(type: TextTransactionDraft["type"] | null): { base: "income" | "expense"; keys: readonly string[] } | null {
  if (type === "income" || type === "exempt-income") return { base: "income", keys: INCOME_CATEGORY_KEYS };
  if (type === "expense" || type === "recognized-expense") return { base: "expense", keys: EXPENSE_CATEGORY_KEYS };
  return null;
}

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** The form's labels, from the transactions namespace. A custom category or method shows as saved. */
function categoryLabel(t: TranslateFn, base: "income" | "expense", value: string): string {
  return isPredefinedCategory(value)
    ? t(`transactionForm.category.${base}.${value}`, { ns: "transactions", defaultValue: value })
    : value;
}

function paymentLabel(t: TranslateFn, value: string): string {
  return t(`transactionForm.paymentMethod.options.${value}`, { ns: "transactions", defaultValue: value });
}

const fieldClass = "border-input bg-background h-9 w-full rounded-md border ps-3 pe-10 text-sm rtl:ps-10 rtl:pe-3";

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
    case "paymentMethod":
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

/** Edited in the card itself, like a draft's fields; "change a detail" opens the rest. */
const INLINE_FIELDS: ReadonlySet<RecurringEditField> = new Set(["amount", "description", "start", "type"]);

export function RecurringDraftCard({
  card,
  saving,
  interactive,
  onChange,
  onSave,
  onDismiss,
  onCancel,
  footer,
}: {
  card: RecurringCard;
  saving: boolean;
  interactive: boolean;
  onChange: (card: RecurringCard) => void;
  onSave: () => void;
  onDismiss: () => void;
  onCancel: () => void;
  /** A saved order's last line: its status, filled by the thread. */
  footer?: SavedFooter;
}) {
  const { t, i18n } = useTranslation("navigation");
  const formatDisplayDate = useDisplayDate();
  const [openField, setOpenField] = useState<RecurringEditField | null>(null);
  const [picking, setPicking] = useState(false);
  const [amountText, setAmountText] = useState(card.amount === null ? "" : String(card.amount));
  const autoCalcChomesh = useDonationStore((state) => state.settings.autoCalcChomesh);
  const chomesh = card.isChomesh ?? autoCalcChomesh;
  const today = getCurrentLocalDate();
  const locked = !interactive || card.saved || saving;
  const start = saveStartDate(card, today);
  const dates = upcomingRecurringDates(card, today);
  const ready = recurringCardReady(card, today);
  const question = nextRecurringQuestion(card);
  const blocked = unsupportedRecurringFrequency(card.frequency);
  // Once the fields show, an amount being retyped keeps them; it must not swap the card back to the questions.
  const [fieldsShown, setFieldsShown] = useState(false);
  if (!blocked && question === null && !fieldsShown) setFieldsShown(true);
  const showSummary = !blocked && (question === null || (question === "amount" && fieldsShown));
  const editing = showSummary && !openField && !picking;
  const cancelOpen = card.saved
    && !card.cancelled
    && card.savedCreatedAt !== null
    && recurringCancelOpen(card.savedCreatedAt, card.executionCount, new Date());
  const surface = card.type ? BASE_TYPE_SURFACE[baseTypeOf(card.type)] : undefined;
  const amountLabel = card.amount !== null && card.currency !== null
    ? formatCurrency(card.amount, card.currency as CurrencyCode, i18n.language.toLowerCase().startsWith("en") ? "en" : "he")
    : null;
  // What was typed, unless the amount changed elsewhere (a question, "change a detail").
  const amountShown = parseDraftAmount(amountText) === card.amount ? amountText : card.amount === null ? "" : String(card.amount);
  const payee = card.description.trim();

  function openOne(field: RecurringEditField) {
    setPicking(false);
    setOpenField(field);
  }

  // The order's first line: that it repeats, then its type.
  const eyebrow = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 font-semibold text-primary">
        <Repeat className="size-3.5" aria-hidden />
        {t("aiIntake.recurring.monthlyTag")}
      </span>
      {card.type ? (
        <TypeTag
          type={card.type}
          variant="text"
          disabled={locked}
          onChange={locked ? undefined : (type) => onChange({ ...card, type })}
        />
      ) : null}
      {card.paymentMethod ? <><span aria-hidden>·</span><span>{paymentLabel(t, card.paymentMethod)}</span></> : null}
    </div>
  );

  const nextCharges = dates.length > 0 ? (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>{t("aiIntake.recurring.nextCharges")}</span>
      {/* Two are enough to show it repeats, and they fit a 320px phone. */}
      {dates.slice(0, 2).map((date) => (
        <span key={date} className="inline-block whitespace-nowrap rounded-full bg-background/80 px-2 py-0.5 font-medium text-foreground">
          <bdi>{formatDisplayDate(date, "short").primary}</bdi>
        </span>
      ))}
    </div>
  ) : null;

  if (card.saved) {
    return (
      <Card className={cn("grid gap-1 p-2.5", surface)}>
        {eyebrow}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          {amountLabel ? <p className="shrink-0 text-lg font-semibold tabular-nums"><bdi>{amountLabel}</bdi></p> : null}
          <p className="min-w-0 break-words text-sm text-muted-foreground">
            {t("aiIntake.recurring.perMonth")}
            {payee ? ` · ${payee}` : ""}
          </p>
        </div>
        {nextCharges}
        <SavedLine status={footer?.status ?? "recurringSaved"}>
          <Button asChild variant="link" size="sm" className="touch-target relative h-auto min-h-11 px-0 py-2 text-xs">
            <Link to="/transactions-table/recurring-transactions">{t("aiIntake.recurring.openTable")}</Link>
          </Button>
          {cancelOpen ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="touch-target relative ms-auto h-auto min-h-11 px-0 py-2 text-xs"
              disabled={!interactive || saving}
              onClick={onCancel}
            >
              {t("aiIntake.recurring.cancel")}
            </Button>
          ) : null}
        </SavedLine>
      </Card>
    );
  }

  if (blocked) {
    return (
      <Card className="grid gap-2 p-2.5">
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
      </Card>
    );
  }

  return (
    <Card className={cn("grid gap-2 p-2.5", surface)}>
      {showSummary ? eyebrow : null}
      {editing ? (
        <>
          {/* The amount is the headline, as on a draft. Its width follows the digits. */}
          <label className="flex w-fit max-w-full items-baseline gap-1.5 border-b border-dashed border-input pb-0.5 focus-within:border-primary">
            <input
              value={amountShown}
              inputMode="decimal"
              dir="ltr"
              aria-label={t("aiIntake.editAmount")}
              disabled={locked}
              className="h-9 min-w-0 border-0 bg-transparent p-0 text-2xl font-semibold tabular-nums shadow-none focus:outline-none focus:ring-0"
              style={{ width: `${Math.max(2, amountShown.length) + 1}ch` }}
              onChange={(event) => {
                setAmountText(event.target.value);
                onChange({ ...card, amount: parseDraftAmount(event.target.value) });
              }}
            />
            <span className="text-lg text-muted-foreground">{getCurrencySymbol(card.currency)}</span>
            <span className="text-sm font-medium text-muted-foreground">{t("aiIntake.recurring.perMonth")}</span>
          </label>
          {/* As on a draft: the start date drops to its own row when the card is narrow. */}
          <div className="flex min-w-0 flex-wrap gap-2">
            <Input
              aria-label={t("aiIntake.editDescription")}
              disabled={locked}
              value={card.description}
              className="h-8 min-w-0 flex-[999_1_12rem] bg-background text-base sm:text-sm"
              onChange={(event) => onChange({ ...card, description: event.target.value })}
            />
            {/* The app's date picker, as on a draft: typed day/month, whatever the browser's locale. */}
            <div className="flex min-w-0 flex-[1_1_9.5rem] items-center gap-1" aria-label={t("aiIntake.recurring.start")} role="group">
              <span className="shrink-0 text-xs text-muted-foreground">{t("aiIntake.recurring.fromShort")}</span>
              <DatePicker
                compact
                date={parseLocalDate(card.startDate ?? start ?? today)}
                setDate={(date) => {
                  if (!date || locked) return;
                  const iso = formatLocalDate(date);
                  if (iso !== card.startDate) onChange(withRecurringStart(card, iso));
                }}
              />
            </div>
          </div>
          {nextCharges}
        </>
      ) : null}
      {question && !showSummary && !openField && !picking ? (
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
          options={RECURRING_EDIT_FIELDS.filter((field) => !INLINE_FIELDS.has(field)).map((field) => ({
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
        <p className="text-xs text-muted-foreground">{t("aiIntake.recurring.appearsTomorrow")}</p>
      ) : null}
      {editing ? (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {card.type === "income" ? (
            <ChomeshToggle
              checked={chomesh}
              disabled={locked}
              onChange={(isChomesh) => onChange({ ...card, isChomesh })}
            />
          ) : null}
          <Button type="button" size="sm" variant="outline" className="min-h-11 sm:min-h-0" disabled={locked} onClick={() => setPicking(true)}>
            {t("aiIntake.recurring.changeDetail")}
          </Button>
          <Button type="button" size="sm" className="flex-1 min-h-11 sm:min-h-0" disabled={locked || !ready} onClick={onSave}>
            {t("aiIntake.recurring.save")}
          </Button>
        </div>
      ) : null}
    </Card>
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
    case "special": {
      const special = card.typeQuestion;
      if (!special) return null;
      return (
        <div className="grid gap-2">
          <ChoiceRow
            prompt={t(`aiIntake.askSpecial.${special}`)}
            disabled={disabled}
            options={[
              { value: "yes", label: t("aiIntake.askSpecialYes") },
              { value: "no", label: t("aiIntake.askSpecialNo") },
            ]}
            onChoose={(answer) => onChange(answer === "yes" ? { ...card, type: special, typeQuestion: null } : { ...card, typeQuestion: null })}
          />
          {leave}
        </div>
      );
    }
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
          maxDay={maxRecurringDay(card.calendarType)}
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
  const amount = parseDraftAmount(draft);
  const valid = amount !== null;
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
        <Button type="button" size="sm" disabled={disabled || !valid} onClick={() => { if (amount !== null) onCommit(amount); }}>
          {t("aiIntake.recurring.continue")}
        </Button>
        {extra}
      </div>
    </div>
  );
}

function DayAsk({
  disabled,
  maxDay,
  onCommit,
  extra,
}: {
  disabled: boolean;
  maxDay: number;
  onCommit: (day: number) => void;
  extra: ReactNode;
}) {
  const { t } = useTranslation("navigation");
  const [draft, setDraft] = useState("");
  const day = Number(draft);
  const valid = Number.isInteger(day) && day >= 1 && day <= maxDay;
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
      return <AmountField card={card} disabled={disabled} onChange={onChange} />;
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
    case "category": {
      const options = categoriesFor(card.type);
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.category")}</Label>
          <select
            aria-label={t("aiIntake.recurring.category")}
            className={fieldClass}
            disabled={disabled || options === null}
            value={card.category ?? ""}
            onChange={(event) => onChange({
              ...card,
              category: event.target.value === "" ? null : event.target.value as TextTransactionDraft["category"],
            })}
          >
            <option value="" />
            {card.category && options && !options.keys.includes(card.category) ? (
              <option value={card.category}>{card.category}</option>
            ) : null}
            {options?.keys.map((category) => (
              <option key={category} value={category}>{categoryLabel(t, options.base, category)}</option>
            ))}
          </select>
        </div>
      );
    }
    case "paymentMethod":
      return (
        <div className="grid gap-1">
          <Label>{t("aiIntake.recurring.paymentMethod")}</Label>
          <select
            aria-label={t("aiIntake.recurring.paymentMethod")}
            className={fieldClass}
            disabled={disabled}
            value={card.paymentMethod ?? ""}
            onChange={(event) => onChange({
              ...card,
              paymentMethod: event.target.value === "" ? null : event.target.value as TextTransactionDraft["paymentMethod"],
            })}
          >
            <option value="" />
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>{paymentLabel(t, method)}</option>
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
              if (!Number.isInteger(day) || day < 1 || day > maxRecurringDay(card.calendarType)) return;
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
            value={recurringTotalOccurrences(card, getCurrentLocalDate()) ?? ""}
            placeholder={t("aiIntake.recurring.openEnded")}
            onChange={(event) => {
              // A typed count replaces "until <date>".
              if (event.target.value === "") {
                onChange({ ...card, totalOccurrences: null, endDate: null });
                return;
              }
              const count = Number(event.target.value);
              if (Number.isInteger(count) && count > 0) onChange({ ...card, totalOccurrences: count, endDate: null });
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

/** The amount as typed. "1,500" is 1500. A value Save would refuse leaves the amount empty. */
function AmountField({
  card,
  disabled,
  onChange,
}: {
  card: RecurringCard;
  disabled: boolean;
  onChange: (card: RecurringCard) => void;
}) {
  const { t } = useTranslation("navigation");
  const [text, setText] = useState(card.amount === null ? "" : String(card.amount));
  return (
    <div className="grid gap-1">
      <Label>{t("aiIntake.editAmount")}</Label>
      <Input
        aria-label={t("aiIntake.editAmount")}
        inputMode="decimal"
        disabled={disabled}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange({ ...card, amount: parseDraftAmount(event.target.value) });
        }}
      />
    </div>
  );
}
