import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDataAnswer } from "@/lib/ai/format-data-answer";
import { periodLabel, type IntakeIntent, type RuleActionType } from "@/lib/ai/classify-intake";
import type { DuplicatePair } from "@/lib/ai/duplicate-scan";
import { useDonationStore } from "@/lib/store";
import type { CurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";
import { BASE_TYPE_ICON } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import type { ReplyBlock } from "./assistant-reply-view";
import { ChoiceRow } from "./blocks/ChoiceRow";
import { DraftCard } from "./blocks/DraftCard";
import { ReceiptAttachment } from "./blocks/ReceiptAttachment";
import { StatusNote } from "./blocks/StatusNote";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";

function hebrewPeriodPhrase(label: string, language: string): string {
  if (language.toLowerCase().startsWith("en")) return label;
  return /^\d/.test(label) ? `ב-${label}` : `ב${label}`;
}

export interface ReplyHandlers {
  onChooseIntent: (intent: IntakeIntent) => void;
  onChooseType: (type: TextTransactionDraft["type"]) => void;
  onChooseFamily: (family: "donation" | "expense" | "income", source: string) => void;
  onSearchDescriptions: (source: string) => void;
  onChooseRule: (type: RuleActionType) => void;
  onApproveRule: () => void;
  onOpenReceipt: () => void;
  onDateChange: (date: string) => void;
  onDescriptionChange: (description: string) => void;
  onAmountChange: (amount: string) => void;
  onSave: (choice?: "saved_anyway" | "same_event") => void;
  onUndo: () => void;
  onAskDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onDismissPair: (pair: DuplicatePair) => void;
  saving: boolean;
  undoing: boolean;
  questionCalendar: "hebrew" | "gregorian";
}

export function ReplyBlockView({
  block,
  interactive,
  handlers,
}: {
  block: ReplyBlock;
  interactive: boolean;
  handlers: ReplyHandlers;
}) {
  const { t, i18n } = useTranslation([
    "navigation",
    "transactions",
    "halacha-expenses",
    "halacha-income",
    "halacha-chomesh",
    "halacha-tithes",
  ]);
  const defaultCurrency = useDonationStore((state) => state.settings.defaultCurrency);

  switch (block.kind) {
    case "thinking":
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {t("aiIntake.checking")}
        </p>
      );
    case "askIntent":
      return (
        <ChoiceRow
          prompt={t("aiIntake.askIntent")}
          disabled={!interactive}
          onChoose={handlers.onChooseIntent}
          options={(["add_transaction", "ask_data", "create_rule"] as const).map((intent) => ({
            value: intent,
            label: t(`aiIntake.intentChoices.${intent}`),
          }))}
        />
      );
    case "intent":
      return (
        <p className="text-sm">
          {t(`aiIntake.intents.${block.intent}`)}{" "}
          {block.showNotSaved ? <span className="text-muted-foreground">{t("aiIntake.notSaved")}</span> : null}
        </p>
      );
    case "dataAnswer":
      return (
        <p className="text-sm">
          {formatDataAnswer({
            measure: block.reply.measure,
            count: block.reply.count,
            year: hebrewPeriodPhrase(periodLabel(block.reply, handlers.questionCalendar, i18n.language), i18n.language),
            type: block.reply.type,
            amount: formatCurrency(
              block.reply.total,
              (block.reply.currency ?? defaultCurrency) as CurrencyCode,
              i18n.language.toLowerCase().startsWith("en") ? "en" : "he",
            ),
            paymentMethod: block.reply.paymentMethod,
            recipient: block.reply.recipient,
            category: block.reply.category,
            language: i18n.language,
          })}
        </p>
      );
    case "askFamily":
      return (
        <ChoiceRow
          prompt={t("aiIntake.askFamily")}
          disabled={!interactive}
          onChoose={(family) => handlers.onChooseFamily(family, block.source)}
          options={(["donation", "expense", "income"] as const).map((family) => ({
            value: family,
            label: t(`aiIntake.types.${family}`),
          }))}
        />
      );
    case "nameMissing":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {t(block.nameKind === "recipient" ? "aiIntake.recipientMissing" : "aiIntake.categoryMissing", { topic: block.topic })}
          </p>
          {interactive ? (
            <Button type="button" variant="outline" size="sm" onClick={() => handlers.onSearchDescriptions(block.source)}>
              {t("aiIntake.categorySearch")}
            </Button>
          ) : null}
        </div>
      );
    case "dataNotice":
      return <p className="text-sm">{t(`aiIntake.${block.status === "unsupported" ? "dataUnsupported" : block.status === "mixed" ? "dataMixed" : "dataFailed"}`)}</p>;
    case "duplicateScan":
      if (block.scan.status === "pending") return <p className="text-sm">{t("aiIntake.duplicateScanPending")}</p>;
      if (block.scan.status === "failed") return <p className="text-sm">{t("aiIntake.duplicateScanFailed")}</p>;
      if (block.scan.count === 0) return <p className="text-sm">{t("aiIntake.duplicateScanEmpty")}</p>;
      return (
        <div className="flex flex-col gap-2 text-sm">
          <p>{t(block.scan.count === 1 ? "aiIntake.duplicateScanCountOne" : "aiIntake.duplicateScanCount", { count: block.scan.count })}</p>
          {block.scan.pairs.map((pair) => (
            <div key={`${pair.left.id}-${pair.right.id}`} className="flex flex-col gap-1">
              {[pair.left, pair.right].map((side) => (
                <div key={side.id} className="flex flex-wrap items-center gap-2">
                  <span>
                    {side.date} · {side.amount} {side.currency}
                    {side.description ? ` · ${side.description}` : ""}
                  </span>
                  {interactive ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => handlers.onAskDelete(side.id)}>
                      {t("aiIntake.duplicateDelete")}
                    </Button>
                  ) : null}
                  {interactive && block.confirmDeleteId === side.id ? (
                    <>
                      <Button type="button" size="sm" onClick={() => handlers.onConfirmDelete(side.id)}>
                        {t("aiIntake.duplicateConfirm")}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handlers.onCancelDelete}>
                        {t("aiIntake.duplicateCancel")}
                      </Button>
                    </>
                  ) : null}
                </div>
              ))}
              {interactive ? (
                <Button type="button" variant="outline" size="sm" onClick={() => handlers.onDismissPair(pair)}>
                  {t("aiIntake.duplicateNot")}
                </Button>
              ) : null}
            </div>
          ))}
          {block.actionFailed ? <p>{t("aiIntake.duplicateActionFailed")}</p> : null}
        </div>
      );
    case "halacha":
      return (
        <div className="flex flex-col gap-2 text-sm">
          <p>{t("introduction.body", { ns: block.namespace })}</p>
          <p>{t("aiIntake.halachaDisclaimer")}</p>
          <Link to="/halacha" className="text-sm underline">
            {t("aiIntake.halachaLink")}
          </Link>
        </div>
      );
    case "rule":
      if (block.rule.action === "ambiguous" && !block.choice) {
        return (
          <ChoiceRow
            prompt={t("aiIntake.askRule")}
            disabled={!interactive}
            onChoose={handlers.onChooseRule}
            options={(["exempt-income", "recognized-expense", "non_tithe_donation"] as const).map((type) => ({
              value: type,
              label: t(`aiIntake.types.${type}`),
            }))}
          />
        );
      }
      return (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            {t("aiIntake.ruleSentence", {
              name: block.rule.name,
              type: t(`aiIntake.types.${block.choice ?? block.rule.action}`),
            })}
          </p>
          {interactive ? (
            <Button type="button" disabled={handlers.saving} onClick={handlers.onApproveRule}>
              {t("aiIntake.ruleApprove")}
            </Button>
          ) : null}
        </div>
      );
    case "askType":
      return (
        <div className="flex flex-col gap-2">
          {block.receipt ? (
            <p className="text-sm text-muted-foreground">
              {t("aiIntake.receiptPreview", {
                description: block.receipt.description,
                date: block.receipt.date,
                amount: block.receipt.amount,
                currency: block.receipt.currency,
              })}
            </p>
          ) : null}
          <ChoiceRow
            prompt={t("aiIntake.askType")}
            disabled={!interactive}
            onChoose={handlers.onChooseType}
            options={(["expense", "income", "donation"] as const).map((type) => ({
              value: type,
              label: t(`aiIntake.types.${type}`),
              icon: BASE_TYPE_ICON[type],
            }))}
          />
        </div>
      );
    case "askAmount":
      return <p className="text-sm font-medium">{t("aiIntake.askAmount")}</p>;
    case "receipt":
      return <ReceiptAttachment link={block.link} onOpen={handlers.onOpenReceipt} />;
    case "draft":
      return (
        <DraftCard
          view={block.view}
          interactive={interactive}
          saving={handlers.saving}
          undoing={handlers.undoing}
          showUndo={false}
          onDateChange={handlers.onDateChange}
          onDescriptionChange={handlers.onDescriptionChange}
          onAmountChange={handlers.onAmountChange}
          onSave={handlers.onSave}
          onUndo={handlers.onUndo}
        />
      );
    case "status":
      return <StatusNote status={block.status} />;
    case "undo":
      if (!interactive) return null;
      return (
        <Button type="button" variant="ghost" size="sm" disabled={handlers.undoing} onClick={handlers.onUndo}>
          {t("aiIntake.undo")}
        </Button>
      );
    default: {
      const unreachable: never = block;
      return unreachable;
    }
  }
}
