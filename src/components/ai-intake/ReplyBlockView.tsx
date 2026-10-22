import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { BASE_TYPE_ICON } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import type { IntakeIntent, RuleActionType, TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { DuplicatePair } from "@/lib/ai/duplicate-scan";
import type { ReplyBlock } from "./assistant-reply-view";
import { ChoiceRow } from "./blocks/ChoiceRow";
import { DataAnswer, DataNotice, NameMissing } from "./blocks/DataAnswer";
import { DraftCard } from "./blocks/DraftCard";
import { DuplicateScanCard } from "./blocks/DuplicateScanCard";
import { HalachaCard } from "./blocks/HalachaCard";
import { ReceiptAttachment } from "./blocks/ReceiptAttachment";
import { RuleCard } from "./blocks/RuleCard";
import { StatusNote } from "./blocks/StatusNote";

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
  const { t } = useTranslation("navigation");

  switch (block.kind) {
    case "thinking":
      return (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {t(block.phase === "data" ? "aiIntake.calculating" : "aiIntake.checking")}
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
      return <DataAnswer reply={block.reply} questionCalendar={handlers.questionCalendar} />;
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
        <NameMissing
          nameKind={block.nameKind}
          topic={block.topic}
          interactive={interactive}
          onSearch={() => handlers.onSearchDescriptions(block.source)}
        />
      );
    case "dataNotice":
      return <DataNotice status={block.status} />;
    case "duplicateScan":
      return (
        <DuplicateScanCard
          scan={block.scan}
          confirmDeleteId={block.confirmDeleteId}
          actionFailed={block.actionFailed}
          interactive={interactive}
          onAskDelete={handlers.onAskDelete}
          onConfirmDelete={handlers.onConfirmDelete}
          onCancelDelete={handlers.onCancelDelete}
          onDismissPair={handlers.onDismissPair}
        />
      );
    case "halacha":
      return <HalachaCard namespace={block.namespace} />;
    case "rule":
      return (
        <RuleCard
          rule={block.rule}
          choice={block.choice}
          interactive={interactive}
          saving={handlers.saving}
          onChoose={handlers.onChooseRule}
          onApprove={handlers.onApproveRule}
        />
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit self-start"
          disabled={handlers.undoing}
          onClick={handlers.onUndo}
        >
          {t("aiIntake.undo")}
        </Button>
      );
    default: {
      const unreachable: never = block;
      return unreachable;
    }
  }
}
