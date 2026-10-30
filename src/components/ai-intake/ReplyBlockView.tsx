import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Shimmer } from "@/components/ui/shimmer";
import { TypeChoice } from "./blocks/TypeChoice";
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
import { RecurringDraftCard } from "./blocks/RecurringDraftCard";
import { MultiDraftList } from "./blocks/MultiDraftList";
import { StatusNote } from "./blocks/StatusNote";
import type { RecurringCard } from "@/lib/ai/recurring-card";
import type { SplitDraft } from "@/lib/ai/split-cards";

export interface ReplyHandlers {
  onChooseIntent: (intent: IntakeIntent) => void;
  onChooseType: (type: TextTransactionDraft["type"]) => void;
  onChooseSpecial: (yes: boolean) => void;
  onChooseFamily: (family: "donation" | "expense" | "income", source: string) => void;
  onSearchDescriptions: (source: string) => void;
  onChooseRule: (type: RuleActionType) => void;
  onApproveRule: () => void;
  onOpenReceipt: () => void;
  onDateChange: (date: string) => void;
  onDescriptionChange: (description: string) => void;
  onAmountChange: (amount: string) => void;
  onSave: (choice?: "saved_anyway" | "same_event") => void;
  onRecurringChange: (card: RecurringCard) => void;
  onSaveRecurring: () => void;
  onDismissRecurring: () => void;
  onCancelRecurring: () => void;
  onSplitChange: (cards: SplitDraft[]) => void;
  onSaveSplit: () => void;
  onUndoSplit: (key: string) => void;
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
        <p role="status" className="text-sm">
          <Shimmer>{t(`aiIntake.thinking.${block.phase}`)}</Shimmer>
        </p>
      );
    case "askIntent":
      return (
        <ChoiceRow
          prompt={t("aiIntake.askIntent")}
          disabled={!interactive}
          onChoose={handlers.onChooseIntent}
          options={(["add_transaction", "ask_data", "create_rule", "create_recurring"] as const).map((intent) => ({
            value: intent,
            label: t(`aiIntake.intentChoices.${intent}`),
          }))}
        />
      );
    case "intent":
      return (
        <div className="grid gap-2">
          <p className="text-sm">
            {t(`aiIntake.intents.${block.intent}`)}{" "}
            {block.showNotSaved ? <span className="text-muted-foreground">{t("aiIntake.notSaved")}</span> : null}
          </p>
          {block.intent === "create_recurring" && block.formLink ? (
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link to="/add-transaction" search={{ recurring: 1 }}>
                {t("aiIntake.openRecurringForm")}
              </Link>
            </Button>
          ) : null}
        </div>
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
        <TypeChoice
          receipt={block.receipt}
          disabled={!interactive}
          onChoose={handlers.onChooseType}
        />
      );
    case "askSpecial":
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t(`aiIntake.askSpecial.${block.type}`)}</p>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={!interactive} onClick={() => handlers.onChooseSpecial(true)}>
              {t("aiIntake.askSpecialYes")}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!interactive} onClick={() => handlers.onChooseSpecial(false)}>
              {t("aiIntake.askSpecialNo")}
            </Button>
          </div>
        </div>
      );
    case "askAmount":
      return <p className="text-sm font-medium">{t("aiIntake.askAmount")}</p>;
    case "receipt":
      return <ReceiptAttachment link={block.link} onOpen={handlers.onOpenReceipt} />;
    case "recurring":
      return (
        <RecurringDraftCard
          card={block.card}
          interactive={interactive}
          saving={handlers.saving}
          onChange={handlers.onRecurringChange}
          onSave={handlers.onSaveRecurring}
          onDismiss={handlers.onDismissRecurring}
          onCancel={handlers.onCancelRecurring}
        />
      );
    case "drafts":
      return (
        <MultiDraftList
          cards={block.cards}
          dropped={block.dropped}
          interactive={interactive}
          saving={handlers.saving}
          onChange={handlers.onSplitChange}
          onSave={handlers.onSaveSplit}
          onUndo={handlers.onUndoSplit}
        />
      );
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
      return (
        <div className="grid gap-2">
          <StatusNote status={block.status} />
          {block.status === "bankStatement" || block.status === "splitList" || block.status === "couldNotRead" ? (
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link to={block.status === "couldNotRead" ? "/add-transaction" : "/transactions-table/import"}>
                {t(block.status === "couldNotRead" ? "aiIntake.openAddForm" : "aiIntake.openImport")}
              </Link>
            </Button>
          ) : null}
        </div>
      );
    case "undo":
      if (!interactive) return null;
      return (
        <Button
          type="button"
          variant="outline"
          className="w-fit self-start"
          disabled={handlers.undoing}
          onClick={handlers.onUndo}
        >
          <RotateCcw aria-hidden />
          {t("aiIntake.undo")}
        </Button>
      );
    default: {
      const unreachable: never = block;
      return unreachable;
    }
  }
}
