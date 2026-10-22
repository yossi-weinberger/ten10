import { AlertTriangle, CircleCheck, Sparkles, Undo2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { GoldenBubbles } from "@/components/ui/golden-bubbles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { isIsoDate } from "@/lib/ai/receipt-card";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { normalizeToBaseType } from "@/lib/data-layer/transactionForm.service";
import { CURRENCIES, type CurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";
import { formatLocalDate, parseLocalDate } from "@/lib/utils/local-date";
import { isOnOrAfterMinTransactionDate, minTransactionDateLocal } from "@/lib/utils/transaction-date";
import { BASE_TYPE_ICON, BASE_TYPE_TINT, type BaseTransactionType } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { DraftView } from "../assistant-reply-view";

function currencySymbol(code: string): string {
  return CURRENCIES.find((item) => item.code === code)?.symbol ?? code;
}

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
  onDateChange,
  onDescriptionChange,
  onAmountChange,
  onSave,
  onUndo,
  undoing,
  showUndo,
}: {
  view: DraftView;
  interactive: boolean;
  saving: boolean;
  undoing: boolean;
  onDateChange: (date: string) => void;
  onDescriptionChange: (description: string) => void;
  onAmountChange: (amount: string) => void;
  onSave: (choice?: "saved_anyway" | "same_event") => void;
  onUndo: () => void;
  showUndo: boolean;
}) {
  const { t, i18n } = useTranslation(["navigation", "transactions"]);
  const formatDisplayDate = useDisplayDate();
  const { draft } = view;
  const base = normalizeToBaseType(draft.type);
  const typeKey = isBaseType(base) ? base : "expense";
  const TypeIcon = BASE_TYPE_ICON[typeKey];
  const locale = i18n.language.toLowerCase().startsWith("en") ? "en" : "he";
  const dateProblem = draftDateProblem(draft.date);
  const readOnly = !interactive || view.locked;
  const reduce = useReducedMotion();
  const inferred = view.inferred;
  const donation = draft.type === "donation" || draft.type === "non_tithe_donation";

  if (readOnly) {
    return (
      <div className="relative">
        {view.locked && donation && !reduce ? <GoldenBubbles active /> : null}
        <Item>
          {view.locked ? <CircleCheck className="size-4 text-success" aria-hidden /> : (
            <TypeIcon className={`size-4 ${BASE_TYPE_TINT[typeKey]} rounded-full p-0.5`} aria-hidden />
          )}
        <ItemContent>
          <ItemTitle>{draft.description || t(`aiIntake.types.${draft.type}`)}</ItemTitle>
          <ItemDescription>
            {formatCurrency(Number(view.amountInput) || draft.amount, draft.currency, locale)}
            {" · "}
            {formatDisplayDate(draft.date, "numeric").primary}
          </ItemDescription>
        </ItemContent>
        {showUndo && interactive ? (
          <Button type="button" variant="ghost" size="sm" disabled={undoing} onClick={onUndo}>
            <Undo2 aria-hidden />
            {t("aiIntake.undo")}
          </Button>
        ) : null}
      </Item>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${BASE_TYPE_TINT[typeKey]}`}>
            <TypeIcon className="size-3.5" aria-hidden />
            {t(`aiIntake.types.${draft.type}`)}
          </span>
          {view.appliedRuleName ? (
            <Badge variant="outline">{t("aiIntake.ruleApplied", { name: view.appliedRuleName })}</Badge>
          ) : null}
        </div>
        <CardDescription>
            {draft.requestedRate === null
              ? t("aiIntake.draftSummary", {
                currency: currencySymbol(draft.currency),
                type: t(`aiIntake.types.${draft.type}`),
              })
              : t("aiIntake.draftMeta", {
                currency: currencySymbol(draft.currency),
                type: t(`aiIntake.types.${draft.type}`),
                rate: draft.requestedRate,
              })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-1">
            {t("aiIntake.editAmount")}
            {inferred?.amount ? <Sparkles className="size-3 text-primary" aria-hidden /> : null}
            {inferred?.amount ? <span className="sr-only">{t("aiIntake.inferred")}</span> : null}
          </Label>
          <div className="relative">
            <InputGroup>
            <InputGroupInput
              value={view.amountInput}
              inputMode="decimal"
              dir="ltr"
              aria-label={t("aiIntake.editAmount")}
              className="text-lg font-semibold tabular-nums"
              onChange={(event) => onAmountChange(event.target.value)}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupText>{currencySymbol(draft.currency)}</InputGroupText>
            </InputGroupAddon>
          </InputGroup>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("aiIntake.editDate")}</Label>
          <DatePicker
            date={parseLocalDate(draft.date)}
            minDate={minTransactionDateLocal()}
            setDate={(date) => {
              if (date) onDateChange(formatLocalDate(date));
            }}
          />
          {dateProblem === "invalid" ? <p className="text-sm text-destructive">{t("aiIntake.editDateInvalid")}</p> : null}
          {dateProblem === "min" ? (
            <p className="text-sm text-destructive">{t("transactionForm.validation.date.min", { ns: "transactions" })}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label>{t("aiIntake.editDescription")}</Label>
          <Input
            value={draft.description}
            aria-label={t("aiIntake.editDescription")}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
        </div>
        {view.duplicates.length > 0 ? (
          <div className="flex flex-col gap-2 sm:col-span-2">
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
      </CardContent>
      <CardFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {view.duplicates.length > 0 ? (
          <Button type="button" variant="outline" disabled={saving || dateProblem !== null} onClick={() => onSave("same_event")}>
            {t("aiIntake.sameEvent")}
          </Button>
        ) : null}
        <Button type="button" disabled={saving || dateProblem !== null} onClick={() => onSave(view.duplicates.length > 0 ? "saved_anyway" : undefined)}>
          {saving ? <Spinner data-icon="inline-start" /> : null}
          {t(view.duplicates.length > 0 ? "aiIntake.saveAnyway" : "aiIntake.save")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export type { TextTransactionDraft };
