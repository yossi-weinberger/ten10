import { useState } from "react";
import { AlertTriangle, BotMessageSquare, CircleCheck, Receipt, RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { isIsoDate } from "@/lib/ai/receipt-card";
import { parseDraftAmount } from "@/lib/ai/draft-amount";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { normalizeToBaseType } from "@/lib/data-layer/transactionForm.service";
import { getCurrencySymbol, type CurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/local-date";
import { isOnOrAfterMinTransactionDate, minTransactionDateLocal } from "@/lib/utils/transaction-date";
import { BASE_TYPE_SURFACE, type BaseTransactionType } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { isPredefinedCategory } from "../../../../supabase/functions/_shared/transaction-domain/category-keys.ts";
import type { DraftView } from "../assistant-reply-view";
import { ChomeshToggle } from "./ChomeshToggle";
import { Confetti } from "./Confetti";
import { SavedLine, type SavedFooter } from "./SavedLine";
import { TypeTag } from "./TypeTag";

function draftDateProblem(date: string): "invalid" | "min" | null {
  if (!isIsoDate(date)) return "invalid";
  if (!isOnOrAfterMinTransactionDate(date)) return "min";
  return null;
}

function isBaseType(type: string): type is BaseTransactionType {
  return type === "income" || type === "expense" || type === "donation";
}

export function DraftCard({
  view,
  interactive,
  saving,
  checkingDuplicates = false,
  onDateChange,
  onDescriptionChange,
  onAmountChange,
  onChomeshChange,
  onTypeChange,
  onSave,
  footer,
}: {
  view: DraftView;
  interactive: boolean;
  saving: boolean;
  checkingDuplicates?: boolean;
  onDateChange: (date: string) => void;
  onDescriptionChange: (description: string) => void;
  onAmountChange: (amount: string) => void;
  onChomeshChange?: (isChomesh: boolean) => void;
  /** Before saving it edits the draft; after saving it undoes and saves again. */
  onTypeChange?: (type: TextTransactionDraft["type"]) => void;
  onSave: (choice?: "saved_anyway" | "same_event") => void;
  /** A saved card's last line: its status, receipt and undo. */
  footer?: SavedFooter;
}) {
  const { t, i18n } = useTranslation(["navigation", "transactions"]);
  const formatDisplayDate = useDisplayDate();
  const reduce = useReducedMotion();
  const { draft } = view;
  const base = normalizeToBaseType(draft.type);
  const typeKey = isBaseType(base) ? base : "expense";
  const locale = i18n.language.toLowerCase().startsWith("en") ? "en" : "he";
  const dateProblem = draftDateProblem(draft.date);
  const readOnly = !interactive || view.locked;
  // The amount Save will store. A field Save would refuse shows the read amount.
  const typedAmount = parseDraftAmount(view.amountInput);
  const income = draft.type === "income";
  const canSave = !saving && !checkingDuplicates && dateProblem === null;
  // Only a save seen by this card celebrates. A card that mounts saved (history, remount) stays still.
  const [wasLocked, setWasLocked] = useState(view.locked);
  const [savedBurst, setSavedBurst] = useState(0);
  if (view.locked !== wasLocked) {
    setWasLocked(view.locked);
    if (view.locked) setSavedBurst((value) => value + 1);
  }
  const detail = typeKey === "donation"
    ? draft.recipient?.trim() || null
    : draft.category
      ? isPredefinedCategory(draft.category)
        ? t(`transactionForm.category.${typeKey}.${draft.category}`, { ns: "transactions", defaultValue: draft.category })
        : draft.category
      : null;

  // What the type means for this draft: a donation's recipient or a category, named so it reads as a field.
  const detailLabel = detail
    ? t(typeKey === "donation" ? "aiIntake.recipientLabel" : "aiIntake.categoryLabel", { name: detail })
    : null;
  const surface = BASE_TYPE_SURFACE[typeKey];
  const dot = <span aria-hidden>·</span>;

  if (readOnly) {
    return (
      // The app's own Card, tinted by type like the add-transaction form.
      <Card className={cn("grid gap-1 p-2.5", surface)}>
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <TypeTag
            type={draft.type}
            variant="text"
            disabled={saving}
            onChange={interactive && view.locked ? onTypeChange : undefined}
          />
          {detailLabel ? <>{dot}<span className="min-w-0 truncate">{detailLabel}</span></> : null}
          {dot}
          <bdi>{formatDisplayDate(draft.date, "numeric").primary}</bdi>
          {income && draft.isChomesh ? <>{dot}<span>{t("aiIntake.chomesh")}</span></> : null}
        </div>
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="shrink-0 text-lg font-semibold tabular-nums">
            <bdi>{formatCurrency(typedAmount ?? draft.amount, draft.currency, locale)}</bdi>
          </p>
          <p className="min-w-0 truncate text-sm text-muted-foreground">{draft.description || t(`aiIntake.types.${draft.type}`)}</p>
        </div>
        {view.locked ? (
          <SavedLine
            status={footer?.status ?? "saved"}
            icon={(
              <motion.span
                className="relative inline-flex"
                initial={savedBurst > 0 && !reduce ? { scale: 0.4, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 18 }}
              >
                <CircleCheck className="size-3.5" aria-hidden />
                {typeKey === "donation" ? <Confetti burst={savedBurst} /> : null}
              </motion.span>
            )}
          >
            {footer?.onOpenReceipt ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                title={t("aiIntake.receiptKept")}
                onClick={footer.onOpenReceipt}
              >
                <Receipt aria-hidden />
                {t("aiIntake.viewReceipt")}
              </Button>
            ) : null}
            {footer?.onUndo ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="ms-auto h-auto px-0 text-xs"
                disabled={footer.undoing}
                onClick={footer.onUndo}
              >
                <RotateCcw aria-hidden />
                {t("aiIntake.undo")}
              </Button>
            ) : null}
          </SavedLine>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className={cn("p-2.5", surface)}>
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          // Enter in a field is "approve and save", like the button.
          event.preventDefault();
          if (canSave) onSave(view.duplicates.length > 0 ? "saved_anyway" : undefined);
        }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <TypeTag type={draft.type} variant="text" disabled={saving} onChange={onTypeChange} />
          {detailLabel ? <>{dot}<span className="min-w-0 truncate">{detailLabel}</span></> : null}
          {view.appliedRuleName ? <>{dot}<span>{t("aiIntake.ruleApplied", { name: view.appliedRuleName })}</span></> : null}
          {draft.requestedRate !== null ? (
            <>
              {dot}
              <span>
                {t("aiIntake.draftMeta", {
                  currency: getCurrencySymbol(draft.currency),
                  type: t(`aiIntake.types.${draft.type}`),
                  rate: draft.requestedRate,
                })}
              </span>
            </>
          ) : null}
          {view.inferred?.amount ? (
            <span className="ms-auto inline-flex items-center gap-1">
              <BotMessageSquare className="size-3.5 text-primary" aria-hidden />
              {t("aiIntake.inferred")}
            </span>
          ) : null}
        </div>
        {/* Locked while saving: the confirmation shows these fields, so they must match what was stored. */}
        <fieldset disabled={saving} className="grid min-w-0 gap-2">
          {/* The amount is the card's headline. Its width follows the digits so the symbol stays beside them. */}
          <label className="flex w-fit max-w-full items-baseline gap-1.5 border-b border-dashed border-input pb-0.5 focus-within:border-primary">
            <input
              value={view.amountInput}
              inputMode="decimal"
              enterKeyHint="done"
              dir="ltr"
              aria-label={t("aiIntake.editAmount")}
              className="h-9 min-w-0 border-0 bg-transparent p-0 text-2xl font-semibold tabular-nums shadow-none focus:outline-none focus:ring-0"
              style={{ width: `${Math.max(2, view.amountInput.length) + 1}ch` }}
              onChange={(event) => onAmountChange(event.target.value)}
            />
            <span className="text-lg text-muted-foreground">{getCurrencySymbol(draft.currency)}</span>
          </label>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
            <Input
              value={draft.description}
              enterKeyHint="done"
              className="h-8 bg-background text-base sm:text-sm"
              aria-label={t("aiIntake.editDescription")}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
            <DatePicker
              compact
              date={parseLocalDate(draft.date)}
              minDate={minTransactionDateLocal()}
              setDate={(date) => {
                // In a form the picker re-commits its date when Save is pressed. The same date must not
                // restart the duplicate check, or Save turns disabled under the click.
                if (date && formatLocalDate(date) !== draft.date) onDateChange(formatLocalDate(date));
              }}
            />
          </div>
          {dateProblem === "invalid" ? <p className="text-sm text-destructive">{t("aiIntake.editDateInvalid")}</p> : null}
          {dateProblem === "min" ? (
            <p className="text-sm text-destructive">{t("transactionForm.validation.date.min", { ns: "transactions" })}</p>
          ) : null}
        </fieldset>
        {view.duplicates.length > 0 ? (
          <div role="alert" className="grid gap-0.5 rounded-md border border-warning/40 bg-background/70 px-2.5 py-1.5 text-xs">
            <p className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="size-3.5 shrink-0 text-warning" aria-hidden />
              {t("aiIntake.duplicateWarning", { count: view.duplicates.length })}
            </p>
            {view.duplicates.slice(0, 3).map((row) => (
              <p key={row.id} className="ps-5 text-muted-foreground">
                <bdi>{formatDisplayDate(row.date, "numeric").primary}</bdi>
                {" · "}
                <bdi>{formatCurrency(row.amount, draft.currency as CurrencyCode, locale)}</bdi>
                {row.description ? ` · ${row.description}` : ""}
                {row.kind === "draft" ? ` · ${t("aiIntake.draftCandidate")}` : ""}
              </p>
            ))}
            {view.duplicatesRanked ? <p className="ps-5 text-muted-foreground">{t("aiIntake.duplicateRanked")}</p> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {income ? (
            <ChomeshToggle
              checked={draft.isChomesh === true}
              disabled={saving}
              onChange={onChomeshChange}
            />
          ) : null}
          {view.duplicates.length > 0 ? (
            <Button type="button" size="sm" variant="outline" disabled={!canSave} onClick={() => onSave("same_event")}>
              {t("aiIntake.sameEvent")}
            </Button>
          ) : null}
          <Button type="submit" size="sm" className="flex-1" disabled={!canSave}>
            {saving ? <Spinner data-icon="inline-start" /> : null}
            {t(view.duplicates.length > 0 ? "aiIntake.saveAnyway" : "aiIntake.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
