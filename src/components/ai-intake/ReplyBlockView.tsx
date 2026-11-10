import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Shimmer } from "@/components/ui/shimmer";
import { Skeleton } from "@/components/ui/skeleton";
import { TypeChoice } from "./blocks/TypeChoice";
import type { IntakeIntent, RuleActionType, TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { DuplicatePair } from "@/lib/ai/duplicate-scan";
import type { ReplyBlock } from "./assistant-reply-view";
import { ChoiceRow } from "./blocks/ChoiceRow";
import { BalanceAnswerCard, DataAnswer, DataNotice, NameMissing, StandingOrdersCard } from "./blocks/DataAnswer";
import { DraftCard } from "./blocks/DraftCard";
import { DuplicateScanCard } from "./blocks/DuplicateScanCard";
import { HalachaCard } from "./blocks/HalachaCard";
import { InspirationCard } from "./blocks/InspirationCard";
import { RabbiCard } from "./blocks/RabbiCard";
import { ReceiptAttachment } from "./blocks/ReceiptAttachment";
import { RuleCard } from "./blocks/RuleCard";
import { RecurringDraftCard } from "./blocks/RecurringDraftCard";
import { MultiDraftList } from "./blocks/MultiDraftList";
import { StatusNote } from "./blocks/StatusNote";
import type { SavedFooter } from "./blocks/SavedLine";
import type { RecurringCard } from "@/lib/ai/recurring-card";
import type { SplitDraft } from "@/lib/ai/split-cards";

export interface ReplyHandlers {
  onChooseIntent: (intent: IntakeIntent) => void;
  onChooseType: (type: TextTransactionDraft["type"]) => void;
  onChooseSpecial: (yes: boolean) => void;
  onChooseFamily: (family: "donation" | "expense" | "income", source: string) => void;
  onSearchDescriptions: (source: string) => void;
  onChooseSavedName: (name: string) => void;
  onAllInPeriod: () => void;
  onChooseRule: (type: RuleActionType) => void;
  onApproveRule: () => void;
  onOpenReceipt: (artifactId: string) => void;
  onDateChange: (date: string) => void;
  onDescriptionChange: (description: string) => void;
  onAmountChange: (amount: string) => void;
  onSave: (choice?: "saved_anyway" | "same_event") => void;
  /** Chomesh on an income draft. Optional: the gallery shows the card without it. */
  onChomeshChange?: (isChomesh: boolean) => void;
  /** The draft's type tag. Optional: the gallery shows the card without it. */
  onTypeChange?: (type: TextTransactionDraft["type"]) => void;
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
  onRabbiSent: (ticket: string) => void;
  onRabbiDismiss: () => void;
  onAskRabbiFromHalacha: (question: string) => void;
  onAnotherInspiration: () => void;
  saving: boolean;
  undoing: boolean;
  /** Duplicate check for the draft still running; its Save waits. */
  checkingDuplicates?: boolean;
  questionCalendar: "hebrew" | "gregorian";
}

export function ReplyBlockView({
  block,
  interactive,
  handlers,
  footer,
  limitInfo,
}: {
  block: ReplyBlock;
  interactive: boolean;
  handlers: ReplyHandlers;
  /** A saved draft or standing order: its last line, filled by the thread. */
  footer?: SavedFooter;
  limitInfo?: import("@/lib/ai/limit-reason").LimitInfo | null;
}) {
  const { t } = useTranslation("navigation");

  switch (block.kind) {
    case "thinking":
      return (
        <div role="status" className="grid gap-2.5">
          <p className="text-sm">
            <Shimmer>{t(`aiIntake.thinking.${block.phase}`)}</Shimmer>
          </p>
          <div className="grid gap-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      );
    case "askIntent":
      return (
        <ChoiceRow
          prompt={t("aiIntake.askIntent")}
          disabled={!interactive}
          onChoose={handlers.onChooseIntent}
          options={(["add_transaction", "ask_data", "create_rule", "create_recurring", "inspiration"] as const).map((intent) => ({
            value: intent,
            label: t(`aiIntake.intentChoices.${intent}`),
          }))}
        />
      );
    case "intent":
      return (
        <div className="grid gap-2">
          <p className="text-sm">{t(`aiIntake.intents.${block.intent}`)}</p>
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
          family={block.family}
          suggestions={block.suggestions}
          interactive={interactive}
          onSearch={() => handlers.onSearchDescriptions(block.source)}
          onChooseName={handlers.onChooseSavedName}
          onAllInPeriod={handlers.onAllInPeriod}
        />
      );
    case "dataNotice":
      return <DataNotice status={block.status} />;
    case "balanceAnswer":
      return <BalanceAnswerCard balance={block.balance} />;
    case "standingOrders":
      return <StandingOrdersCard rows={block.rows} />;
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
      return (
        <HalachaCard
          namespace={block.namespace}
          userQuestion={block.userQuestion}
          onAskRabbi={block.userQuestion ? () => handlers.onAskRabbiFromHalacha(block.userQuestion!) : undefined}
        />
      );
    case "inspiration":
      return (
        <InspirationCard
          key={block.item?.id ?? "empty"}
          item={block.item}
          onAnother={interactive ? handlers.onAnotherInspiration : undefined}
        />
      );
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
      return <ReceiptAttachment link={block.link} onOpen={() => handlers.onOpenReceipt(block.artifactId)} />;
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
          footer={footer}
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
          checkingDuplicates={handlers.checkingDuplicates === true}
          onDateChange={handlers.onDateChange}
          onDescriptionChange={handlers.onDescriptionChange}
          onAmountChange={handlers.onAmountChange}
          onChomeshChange={handlers.onChomeshChange}
          onTypeChange={handlers.onTypeChange}
          onSave={handlers.onSave}
          footer={footer}
        />
      );
    case "status":
      return (
        <div className="grid gap-2">
          <StatusNote status={block.status} limitInfo={limitInfo} />
          {block.status === "bankStatement" || block.status === "splitList" || block.status === "couldNotRead" ? (
            <Button asChild variant="outline" size="sm" className="w-fit">
              <Link to={block.status === "couldNotRead" ? "/add-transaction" : "/transactions-table/import"}>
                {t(block.status === "couldNotRead" ? "aiIntake.openAddForm" : "aiIntake.openImport")}
              </Link>
            </Button>
          ) : null}
        </div>
      );
    case "rabbi":
      return (
        <RabbiCard
          text={block.text}
          ticket={block.ticket}
          interactive={interactive}
          onSent={handlers.onRabbiSent}
          onDismiss={handlers.onRabbiDismiss}
        />
      );
    case "undo":
      if (!interactive) return null;
      return (
        <Button
          type="button"
          variant="outline"
          size="sm"
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
