import { useState } from "react";
import { AlertTriangle, CircleCheck, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { isIsoDate } from "@/lib/ai/receipt-card";
import { parseDraftAmount } from "@/lib/ai/draft-amount";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { normalizeToBaseType } from "@/lib/data-layer/transactionForm.service";
import { getCurrencySymbol, type CurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/local-date";
import { isOnOrAfterMinTransactionDate, minTransactionDateLocal } from "@/lib/utils/transaction-date";
import type { BaseTransactionType } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { isPredefinedCategory } from "../../../../supabase/functions/_shared/transaction-domain/category-keys.ts";
import type { DraftView } from "../assistant-reply-view";
import { ChomeshToggle } from "./ChomeshToggle";
import { Confetti } from "./Confetti";
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

  if (readOnly) {
    return (
      // The app's own Card, like the transaction form; the type shows in its tag, not in the card's chrome.
      <Card className="relative flex items-center gap-3 p-3">
        {view.locked ? (
          <motion.span
            className="relative inline-flex"
            initial={savedBurst > 0 && !reduce ? { scale: 0.4, opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
          >
            <CircleCheck className="size-5 text-success" aria-hidden />
            {typeKey === "donation" ? <Confetti burst={savedBurst} /> : null}
          </motion.span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{draft.description || t(`aiIntake.types.${draft.type}`)}</p>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(typedAmount ?? draft.amount, draft.currency, locale)}
            {" · "}
            {formatDisplayDate(draft.date, "numeric").primary}
            {detail ? ` · ${detail}` : null}
            {income && draft.isChomesh ? ` · ${t("aiIntake.chomesh")}` : null}
          </p>
        </div>
        <TypeTag
          type={draft.type}
          disabled={saving}
          onChange={interactive && view.locked ? onTypeChange : undefined}
        />
      </Card>
    );
  }

  return (
    <Card>
      <form
        className="grid gap-3 p-3"
        onSubmit={(event) => {
          // Enter in a field is "approve and save", like the button.
          event.preventDefault();
          if (canSave) onSave(view.duplicates.length > 0 ? "saved_anyway" : undefined);
        }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <TypeTag type={draft.type} disabled={saving} onChange={onTypeChange} />
          {detail ? <Badge variant="outline" className="max-w-full truncate font-normal">{detail}</Badge> : null}
          {view.appliedRuleName ? (
            <Badge variant="outline">{t("aiIntake.ruleApplied", { name: view.appliedRuleName })}</Badge>
          ) : null}
          {draft.requestedRate !== null ? (
            <span className="text-xs text-muted-foreground">
              {t("aiIntake.draftMeta", {
                currency: getCurrencySymbol(draft.currency),
                type: t(`aiIntake.types.${draft.type}`),
                rate: draft.requestedRate,
              })}
            </span>
          ) : null}
        </div>
        {/* Locked while saving: the confirmation shows these fields, so they must match what was stored. */}
        <fieldset disabled={saving} className="grid min-w-0 grid-cols-2 gap-2">
          <div className="flex min-w-0 flex-col gap-1">
            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
              {t("aiIntake.editAmount")}
              {view.inferred?.amount ? <Sparkles className="size-3 text-primary" aria-hidden /> : null}
              {view.inferred?.amount ? <span className="sr-only">{t("aiIntake.inferred")}</span> : null}
            </Label>
            <InputGroup className="bg-background">
              <InputGroupInput
                value={view.amountInput}
                inputMode="decimal"
                enterKeyHint="done"
                dir="ltr"
                aria-label={t("aiIntake.editAmount")}
                className="text-base font-semibold tabular-nums"
                onChange={(event) => onAmountChange(event.target.value)}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>{getCurrencySymbol(draft.currency)}</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{t("aiIntake.editDate")}</Label>
            <DatePicker
              date={parseLocalDate(draft.date)}
              minDate={minTransactionDateLocal()}
              setDate={(date) => {
                // In a form the picker re-commits its date when Save is pressed. The same date must not
                // restart the duplicate check, or Save turns disabled under the click.
                if (date && formatLocalDate(date) !== draft.date) onDateChange(formatLocalDate(date));
              }}
            />
          </div>
          {dateProblem === "invalid" ? <p className="col-span-2 text-sm text-destructive">{t("aiIntake.editDateInvalid")}</p> : null}
          {dateProblem === "min" ? (
            <p className="col-span-2 text-sm text-destructive">{t("transactionForm.validation.date.min", { ns: "transactions" })}</p>
          ) : null}
          <div className="col-span-2 flex flex-col gap-1">
            <Label className="text-xs text-muted-foreground">{t("aiIntake.editDescription")}</Label>
            <Input
              value={draft.description}
              enterKeyHint="done"
              className="bg-background text-base sm:text-sm"
              aria-label={t("aiIntake.editDescription")}
              onChange={(event) => onDescriptionChange(event.target.value)}
            />
          </div>
        </fieldset>
        {view.duplicates.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Alert variant="warning">
              <AlertTriangle aria-hidden />
              <AlertTitle>{t("aiIntake.duplicateWarning", { count: view.duplicates.length })}</AlertTitle>
              {view.duplicatesRanked ? <AlertDescription>{t("aiIntake.duplicateRanked")}</AlertDescription> : null}
            </Alert>
            <ItemGroup>
              {view.duplicates.slice(0, 3).map((row) => (
                <Item key={row.id} size="sm">
                  <ItemContent>
                    <ItemTitle>
                      {formatDisplayDate(row.date, "numeric").primary}
                      {" · "}
                      {formatCurrency(row.amount, draft.currency as CurrencyCode, locale)}
                    </ItemTitle>
                    <ItemDescription>
                      {row.description}
                      {row.kind === "draft" ? ` · ${t("aiIntake.draftCandidate")}` : ""}
                    </ItemDescription>
                  </ItemContent>
                  {row.kind === "draft" ? <Badge variant="secondary">{t("aiIntake.draftCandidate")}</Badge> : null}
                </Item>
              ))}
            </ItemGroup>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {income ? (
            <ChomeshToggle
              checked={draft.isChomesh === true}
              disabled={saving}
              onChange={onChomeshChange}
            />
          ) : null}
          <div className="ms-auto flex flex-wrap justify-end gap-2">
            {view.duplicates.length > 0 ? (
              <Button type="button" size="sm" variant="outline" disabled={!canSave} onClick={() => onSave("same_event")}>
                {t("aiIntake.sameEvent")}
              </Button>
            ) : null}
            <Button type="submit" size="sm" disabled={!canSave}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              {t(view.duplicates.length > 0 ? "aiIntake.saveAnyway" : "aiIntake.save")}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
