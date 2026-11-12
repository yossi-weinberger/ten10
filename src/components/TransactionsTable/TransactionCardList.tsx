import { useCallback, useMemo, useState, useRef, memo } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck, CalendarClock, ChevronRight, Coins, Edit3, Receipt, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { Transaction, TransactionForTable, TransactionType } from "@/types/transaction";
import { cn } from "@/lib/utils/formatting";
import { formatCurrency, hasStoredCurrencyConversion } from "@/lib/utils/currency";
import type { CurrencyCode } from "@/lib/currencies";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { formatCategory } from "@/lib/category-registry";
import { formatPaymentMethod } from "@/lib/payment-methods";
import { formatBoolean } from "@/lib/utils/formatting";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { CurrencyConversionInfo } from "@/components/Currency/CurrencyConversionInfo";
import { RecurringProgressBadge } from "./RecurringProgressBadge";
import { typeBadgeColors } from "@/types/transactionLabels";
import { useEffectiveCalendarType } from "@/lib/calendar/calendar-preview";
import {
  formatCalendarMonthLabel,
  getCalendarMonthKey,
} from "@/lib/calendar/calendar-period";
import { CardListStates } from "@/components/card-list/CardListStates";
import { groupWithSeparators } from "@/components/card-list/group-with-separators";
import { StickyGroupHeader } from "@/components/card-list/StickyGroupHeader";
import { MobileBulkToolbar } from "@/components/card-list/MobileBulkToolbar";
import { SwipeableCardRow } from "@/components/card-list/SwipeableCardRow";
import {
  AmountPanel,
  MOBILE_NEUTRAL_CARD_HEIGHT_CLASS,
  MOBILE_NEUTRAL_CARD_PAD_CLASS,
  TypeIconChip,
} from "@/components/card-list/TypeVisual";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatform, type Platform } from "@/contexts/PlatformContext";
import { canUndoAiTransaction } from "@/lib/ai/ai-undo-eligibility";
import { isAiIntakeEnabled, useAiIntakeUi } from "@/lib/ai/flags";
import { openAiReceipt } from "@/lib/ai/open-receipt";
import { receiptExpiryDate, showReceiptAction } from "@/lib/ai/receipt-action";
import { useDonationStore } from "@/lib/store";
import { useMobileSelectionBodyFlag } from "@/hooks/useMobileSelectionBodyFlag";
import { useRestoreOverlayOnUnmount } from "@/hooks/useRestoreOverlayOnUnmount";
import { useSwipeOpenRow } from "@/hooks/useSwipeOpenRow";
import { shouldShowAiOriginIndicator } from "./ai-origin";
import { AiOriginIndicator } from "./AiOriginIndicator";

interface TransactionCardListProps {
  transactions: TransactionForTable[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onEditRecurring: (recurringId: string) => void;
  onUndoAi?: (transaction: Transaction) => void;
  isFetchingRec: boolean;
  loading?: boolean;
  selectedIds?: Set<string>;
  onToggleSelected?: (id: string) => void;
  onClearSelection?: () => void;
  selectionDisabled?: boolean;
  selectedCountLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  clearLabel?: string;
  bulkToolbarAriaLabel?: string;
  onSelectionEdit?: () => void;
  onSelectionDelete?: () => void;
  bulkPending?: boolean;
  bulkEditDisabled?: boolean;
  showMonthSeparators?: boolean;
  /** Date sorts place this on the first month row. Other sorts use a compact row. */
  sortControl?: React.ReactNode;
}

const isSpecialType = (type: TransactionType): boolean => {
  return type === "exempt-income" || 
         type === "recognized-expense" || 
         type === "non_tithe_donation" || 
         type === "initial_balance";
};

function storedConversion(transaction: TransactionForTable): {
  originalAmount: number;
  originalCurrency: CurrencyCode;
  rate: number | null | undefined;
} | null {
  if (
    transaction.original_amount == null ||
    transaction.original_currency == null ||
    !hasStoredCurrencyConversion({
      amount: transaction.amount,
      currency: transaction.currency,
      originalAmount: transaction.original_amount,
      originalCurrency: transaction.original_currency,
    })
  ) {
    return null;
  }

  return {
    originalAmount: transaction.original_amount,
    originalCurrency: transaction.original_currency,
    rate: transaction.conversion_rate,
  };
}

function categoryFamilyOf(type: TransactionType): "income" | "expense" | null {
  if (type === "income" || type === "exempt-income") return "income";
  if (type === "expense" || type === "recognized-expense") return "expense";
  return null;
}

function nonEmptyText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatConversionDetail(
  originalAmount: number,
  originalCurrency: CurrencyCode,
  rate: number | null | undefined,
): string {
  // en formatting keeps the symbol and amount in one LTR run. he-IL inserts RLM marks that split them.
  const original = formatCurrency(originalAmount, originalCurrency, "en");
  if (typeof rate !== "number" || !Number.isFinite(rate)) return original;
  return `${original} × ${rate.toFixed(2)}`;
}

const drawerRowClass =
  "flex min-h-11 w-full items-center justify-between gap-3 py-2 text-start";
const drawerValueClass =
  "min-w-0 truncate text-end text-[15px] font-medium leading-[1.3]";

function DrawerField({
  label,
  children,
  maskLabel = false,
}: {
  label: string;
  children: React.ReactNode;
  maskLabel?: boolean;
}) {
  return (
    <div className={drawerRowClass}>
      <span
        className={cn(
          "shrink-0 text-[13px] leading-[1.3] text-muted-foreground",
          maskLabel && PH_SENSITIVE_PROPS.className,
        )}
        data-ph-mask={maskLabel ? PH_SENSITIVE_PROPS["data-ph-mask"] : undefined}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function maskedDrawerValue(value: string) {
  return (
    <div
      className={cn(drawerValueClass, PH_SENSITIVE_PROPS.className)}
      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
    >
      {value}
    </div>
  );
}

function drawerDateValue(primary: string, secondary?: string) {
  if (!secondary) {
    return (
      <bdi
        className={cn(drawerValueClass, PH_SENSITIVE_PROPS.className)}
        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
      >
        {primary}
      </bdi>
    );
  }

  return (
    <span className="min-w-0 text-end text-[15px] font-medium leading-[1.3]">
      <bdi
        className={PH_SENSITIVE_PROPS.className}
        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
      >
        {primary}
      </bdi>
      <bdi
        className={cn(
          "mt-0.5 block text-[13px] font-normal leading-[1.3] text-muted-foreground",
          PH_SENSITIVE_PROPS.className,
        )}
        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
      >
        {secondary}
      </bdi>
    </span>
  );
}

const CARD_SURFACE_CLASS = cn(
  MOBILE_NEUTRAL_CARD_HEIGHT_CLASS,
  MOBILE_NEUTRAL_CARD_PAD_CLASS,
  "overflow-hidden bg-white dark:bg-card",
);

interface TransactionCardProps {
  transaction: TransactionForTable;
  displayDate: { primary: string | null };
  categoryText: string;
  cardTitle: string;
  isSelected: boolean;
  inSelectionMode: boolean;
  onCardClick: (transaction: TransactionForTable) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onToggleSelected?: (id: string) => void;
  selectionDisabled: boolean;
  longPressTriggeredRef: React.MutableRefObject<boolean>;
  trackChomeshSeparately: boolean;
  t: (key: string, defaultValue?: string) => string;
  isRTL: boolean;
  onEdit: (transaction: TransactionForTable) => void;
  onDelete: (transaction: TransactionForTable) => void;
  swipeOpenId: string | null;
  onSwipeOpen: (id: string) => void;
  onSwipeClose: () => void;
  platform: Platform;
  aiIntakeEnabled: boolean;
}

const TransactionCard = memo(function TransactionCard({
  transaction,
  displayDate,
  categoryText,
  cardTitle,
  isSelected,
  inSelectionMode,
  onCardClick,
  onKeyDown,
  onToggleSelected,
  selectionDisabled,
  longPressTriggeredRef,
  trackChomeshSeparately,
  t,
  isRTL,
  onEdit,
  onDelete,
  swipeOpenId,
  onSwipeOpen,
  onSwipeClose,
  platform,
  aiIntakeEnabled,
}: TransactionCardProps) {
  const { i18n } = useTranslation("data-tables");
  const showAiOrigin = shouldShowAiOriginIndicator(
    platform,
    transaction.origin,
    aiIntakeEnabled,
  );
  const conversion = storedConversion(transaction);
  return (
    <SwipeableCardRow
      id={transaction.id}
      surfaceClassName={CARD_SURFACE_CLASS}
      isSelected={isSelected}
      inSelectionMode={inSelectionMode}
      selectionDisabled={selectionDisabled}
      onToggleSelected={onToggleSelected}
      onActivate={() => onCardClick(transaction)}
      onKeyDown={onKeyDown}
      longPressTriggeredRef={longPressTriggeredRef}
      isRTL={isRTL}
      openId={swipeOpenId}
      onSwipeOpen={onSwipeOpen}
      onSwipeClose={onSwipeClose}
      actions={[
        {
          icon: <Edit3 className="h-5 w-5" />,
          label: t("actions.edit"),
          variant: "default",
          onClick: () => onEdit(transaction),
        },
        {
          icon: <Trash2 className="h-5 w-5" />,
          label: t("actions.delete"),
          variant: "destructive",
          onClick: () => onDelete(transaction),
        },
      ]}
    >
      <TypeIconChip type={transaction.type} />
      <div className="flex-1 min-w-0 overflow-hidden">
        <div
          className={cn(
            showAiOrigin
              ? "flex min-w-0 items-center gap-1 text-[12px] font-medium leading-none"
              : "truncate text-[12px] font-medium leading-none",
            !transaction.description && "text-muted-foreground",
            PH_SENSITIVE_PROPS.className
          )}
          data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
        >
          {showAiOrigin ? (
            <span className="block min-w-0 truncate">{cardTitle}</span>
          ) : (
            cardTitle
          )}
          <AiOriginIndicator
            origin={transaction.origin}
            platform={platform}
            aiIntakeEnabled={aiIntakeEnabled}
            className="shrink-0"
          />
        </div>
        <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-px overflow-hidden text-[10px] leading-none text-muted-foreground">
          <span
            className={cn(
              "shrink-0 whitespace-nowrap",
              PH_SENSITIVE_PROPS.className,
            )}
            data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
          >
            {displayDate.primary}
          </span>
          {categoryText && (
            <>
              <span className="shrink-0" aria-hidden="true">
                ·
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate",
                  PH_SENSITIVE_PROPS.className,
                )}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                {categoryText}
              </span>
            </>
          )}
          {transaction.recurring_info && (
            <>
              <span className="shrink-0" aria-hidden="true">
                ·
              </span>
              <span
                className={cn("shrink-0", PH_SENSITIVE_PROPS.className)}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                <CalendarClock className="h-2.5 w-2.5" aria-hidden="true" />
              </span>
            </>
          )}
          {isSpecialType(transaction.type) && (
            <Badge
              variant="outline"
              className={cn(
                "h-3 shrink-0 whitespace-nowrap border px-1 py-0 text-[9px] leading-none",
                typeBadgeColors[transaction.type as TransactionType],
              )}
            >
              {t(`types.${transaction.type}`, transaction.type)}
            </Badge>
          )}
          {trackChomeshSeparately && transaction.is_chomesh && (
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[9px]",
                PH_SENSITIVE_PROPS.className,
              )}
              data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
            >
              <BadgeCheck
                className="h-3 w-3 shrink-0 text-green-600"
                aria-hidden="true"
              />
              <span
                className={cn(
                  "whitespace-nowrap",
                  PH_SENSITIVE_PROPS.className,
                )}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                {t("cards.chomesh")}
              </span>
            </span>
          )}
        </div>
      </div>
      <AmountPanel
        type={transaction.type}
        conversion={
          conversion ? (
            <div
              className={cn(
                "inline-flex items-center gap-0.5 leading-none",
                PH_SENSITIVE_PROPS.className,
              )}
              data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
            >
              <Coins className="h-2 w-2 shrink-0 opacity-70" aria-hidden="true" />
              <span
                className={cn(
                  "text-[9px] font-normal leading-none text-muted-foreground",
                  PH_SENSITIVE_PROPS.className,
                )}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                {formatCurrency(
                  conversion.originalAmount,
                  conversion.originalCurrency,
                  i18n.language,
                )}
              </span>
            </div>
          ) : undefined
        }
      >
        <div
          className={cn(PH_SENSITIVE_PROPS.className)}
          data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
        >
          <CurrencyConversionInfo
            amount={transaction.amount}
            currency={transaction.currency}
            originalAmount={transaction.original_amount}
            originalCurrency={transaction.original_currency}
            conversionRate={transaction.conversion_rate}
            conversionDate={transaction.conversion_date}
            rateSource={transaction.rate_source}
            mode="static"
            showConversionIcon={false}
          />
        </div>
      </AmountPanel>
    </SwipeableCardRow>
  );
});

export function TransactionCardList({
  transactions,
  onEdit,
  onDelete,
  onEditRecurring,
  onUndoAi,
  isFetchingRec,
  loading = false,
  selectedIds = new Set(),
  onToggleSelected,
  onClearSelection,
  selectionDisabled = false,
  selectedCountLabel,
  editLabel,
  deleteLabel,
  clearLabel,
  bulkToolbarAriaLabel,
  onSelectionEdit,
  onSelectionDelete,
  bulkPending = false,
  bulkEditDisabled = false,
  showMonthSeparators = true,
  sortControl,
}: TransactionCardListProps) {
  const { t, i18n } = useTranslation("data-tables");
  const formatDisplayDate = useDisplayDate();
  const calendarType = useEffectiveCalendarType();
  const { user } = useAuth();
  const { platform } = usePlatform();
  const aiIntakeEnabled = useAiIntakeUi(platform, Boolean(user));
  const trackChomeshSeparately = useDonationStore(
    (state) => state.settings.trackChomeshSeparately,
  );
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionForTable | null>(null);
  useRestoreOverlayOnUnmount(selectedTransaction != null);
  const [receiptNote, setReceiptNote] = useState<string | null>(null);
  const [receiptLink, setReceiptLink] = useState<string | null>(null);
  const longPressTriggeredRef = useRef(false);
  const inSelectionMode = selectedIds.size > 0;
  const {
    openId: computedSwipeOpenId,
    open: handleSwipeOpen,
    close: handleSwipeClose,
  } = useSwipeOpenRow(inSelectionMode);
  useMobileSelectionBodyFlag(inSelectionMode);

  const transactionsWithSeparators = useMemo(
    () =>
      groupWithSeparators(
        transactions,
        (transaction) => getCalendarMonthKey(transaction.date, calendarType),
        showMonthSeparators,
      ),
    [transactions, calendarType, showMonthSeparators],
  );

  let firstSeparatorKey: string | undefined;
  for (const item of transactionsWithSeparators) {
    if (item.type === "separator") {
      firstSeparatorKey = item.key;
      break;
    }
  }
  const chipOnFirstSeparator = sortControl != null && firstSeparatorKey !== undefined;
  const sortRow = sortControl ? (
    <div data-sort-chip-slot="row" className="flex h-11 items-center">
      <div className="ms-auto max-w-full">{sortControl}</div>
    </div>
  ) : null;

  const handleCardClick = useCallback((transaction: TransactionForTable) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (inSelectionMode && onToggleSelected) {
      if (!selectionDisabled) {
        onToggleSelected(transaction.id);
      }
      return;
    }

    // Pending bulk work must not open the drawer. A refetch still can.
    if (bulkPending) {
      return;
    }

    setSelectedTransaction(transaction);
  }, [bulkPending, inSelectionMode, onToggleSelected, selectionDisabled]);

  const handleCloseDrawer = useCallback(() => {
    setSelectedTransaction(null);
    setReceiptNote(null);
    setReceiptLink(null);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedTransaction) {
      onEdit(selectedTransaction);
      handleCloseDrawer();
    }
  }, [selectedTransaction, onEdit, handleCloseDrawer]);

  const handleDelete = useCallback(() => {
    if (selectedTransaction) {
      onDelete(selectedTransaction);
      handleCloseDrawer();
    }
  }, [selectedTransaction, onDelete, handleCloseDrawer]);

  const handleEditRecurring = useCallback(() => {
    if (selectedTransaction?.source_recurring_id) {
      onEditRecurring(selectedTransaction.source_recurring_id);
      handleCloseDrawer();
    }
  }, [selectedTransaction, onEditRecurring, handleCloseDrawer]);

  const handleUndoAi = useCallback(() => {
    if (selectedTransaction && onUndoAi) {
      onUndoAi(selectedTransaction);
      handleCloseDrawer();
    }
  }, [selectedTransaction, onUndoAi, handleCloseDrawer]);

  const handleOpenReceipt = useCallback(async () => {
    if (!selectedTransaction) return;
    setReceiptNote(null);
    setReceiptLink(null);
    const result = await openAiReceipt({ transactionId: selectedTransaction.id });
    if (result.status === "opened") return;
    if (result.status === "blocked") {
      setReceiptLink(result.url);
      return;
    }
    setReceiptNote(t(result.status === "none" ? "filters.receiptNone" : "filters.receiptFailed"));
  }, [selectedTransaction, t]);

  if (loading && transactions.length === 0) {
    return <CardListStates status="loading" header={sortRow} />;
  }

  if (!loading && transactions.length === 0) {
    return <CardListStates status="empty" text={t("messages.noData")} header={sortRow} />;
  }

  const selectedConversion = selectedTransaction
    ? storedConversion(selectedTransaction)
    : null;
  const drawerTitle =
    selectedTransaction?.description || t("messages.defaultTransactionName");
  const showDrawerAiOrigin =
    selectedTransaction != null &&
    shouldShowAiOriginIndicator(
      platform,
      selectedTransaction.origin,
      aiIntakeEnabled,
    );

  return (
    <>
      {inSelectionMode && onClearSelection && onSelectionEdit && onSelectionDelete && 
       selectedCountLabel && editLabel && deleteLabel && clearLabel && bulkToolbarAriaLabel && (
        <MobileBulkToolbar
          selectedCount={selectedIds.size}
          selectedCountLabel={selectedCountLabel}
          editLabel={editLabel}
          deleteLabel={deleteLabel}
          clearLabel={clearLabel}
          onEdit={onSelectionEdit}
          onDelete={onSelectionDelete}
          onClear={onClearSelection}
          ariaLabel={bulkToolbarAriaLabel}
          pending={bulkPending}
          disabled={selectionDisabled}
          editDisabled={bulkEditDisabled}
          dir={i18n.dir()}
        />
      )}
      <div className="space-y-2">
        {chipOnFirstSeparator ? null : sortRow}
        {transactionsWithSeparators.map((item) => {
          if (item.type === "separator") {
            const placeChip =
              chipOnFirstSeparator && item.key === firstSeparatorKey;
            return (
              <StickyGroupHeader
                key={`month-separator-${item.key}`}
                label={
                  <span
                    className={cn(
                      PH_SENSITIVE_PROPS.className,
                      placeChip && "me-48 block max-w-[calc(100%-12rem)] truncate",
                    )}
                    data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                  >
                    {formatCalendarMonthLabel(item.key, calendarType, i18n.language)}
                  </span>
                }
                placeChip={placeChip}
                chip={sortControl}
              />
            );
          }

          const transaction = item.item;
          const displayDate = formatDisplayDate(transaction.date, "numeric");
          
          const cardTitle = transaction.description
            ? transaction.description
            : formatCategory(
                transaction.type === "income" || transaction.type === "exempt-income" ? "income"
                  : transaction.type === "expense" || transaction.type === "recognized-expense" ? "expense"
                  : undefined,
                transaction.category,
                i18n.language,
                t(`types.${transaction.type}`, transaction.type)
              );
          
          const categoryText = transaction.category
            ? formatCategory(
                transaction.type === "income" || transaction.type === "exempt-income" ? "income"
                  : transaction.type === "expense" || transaction.type === "recognized-expense" ? "expense"
                  : undefined,
                transaction.category,
                i18n.language,
                ""
              )
            : "";

          const isSelected = selectedIds.has(transaction.id);

          const handleKeyDown = (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleCardClick(transaction);
            }
          };

          return (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              displayDate={displayDate}
              categoryText={categoryText}
              cardTitle={cardTitle}
              isSelected={isSelected}
              inSelectionMode={inSelectionMode}
              onCardClick={handleCardClick}
              onKeyDown={handleKeyDown}
              onToggleSelected={onToggleSelected}
              selectionDisabled={selectionDisabled}
              longPressTriggeredRef={longPressTriggeredRef}
              trackChomeshSeparately={trackChomeshSeparately}
              t={t}
              isRTL={i18n.dir() === "rtl"}
              onEdit={onEdit}
              onDelete={onDelete}
              swipeOpenId={computedSwipeOpenId}
              onSwipeOpen={handleSwipeOpen}
              onSwipeClose={handleSwipeClose}
              platform={platform}
              aiIntakeEnabled={aiIntakeEnabled}
            />
          );
        })}
      </div>

      <Drawer open={!!selectedTransaction} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <DrawerContent dir={i18n.dir()}>
          <DrawerHeader className="flex flex-col gap-0 p-4 pb-3 text-start sm:text-start">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <DrawerTitle
                className={cn(
                  showDrawerAiOrigin
                    ? "flex min-w-0 flex-1 items-center gap-1 text-start font-semibold leading-[1.2] tracking-[-0.01em]"
                    : "min-w-0 flex-1 break-words text-start font-semibold leading-[1.2] tracking-[-0.01em] line-clamp-2",
                  PH_SENSITIVE_PROPS.className,
                )}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                {showDrawerAiOrigin ? (
                  <span className="min-w-0 break-words line-clamp-2">{drawerTitle}</span>
                ) : (
                  drawerTitle
                )}
                <AiOriginIndicator
                  origin={selectedTransaction?.origin}
                  platform={platform}
                  aiIntakeEnabled={aiIntakeEnabled}
                  className="shrink-0"
                />
              </DrawerTitle>
              {selectedTransaction ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 whitespace-nowrap border",
                    typeBadgeColors[selectedTransaction.type],
                  )}
                >
                  {t(`types.${selectedTransaction.type}`, selectedTransaction.type)}
                </Badge>
              ) : null}
            </div>
            {selectedTransaction ? (
              <div className="mt-3 text-center">
                <div
                  className={cn(
                    "text-[32px] font-bold leading-[1.15]",
                    PH_SENSITIVE_PROPS.className,
                  )}
                  data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                >
                  <CurrencyConversionInfo
                    amount={selectedTransaction.amount}
                    currency={selectedTransaction.currency}
                    originalAmount={selectedTransaction.original_amount}
                    originalCurrency={selectedTransaction.original_currency}
                    conversionRate={selectedTransaction.conversion_rate}
                    conversionDate={selectedTransaction.conversion_date}
                    rateSource={selectedTransaction.rate_source}
                    mode="static"
                    showConversionIcon={false}
                  />
                </div>
                {selectedConversion ? (
                  <Badge
                    variant="outline"
                    className="mt-2 gap-[5px] whitespace-nowrap border-[hsl(182_30%_78%)] bg-[hsl(182_40%_93%)] py-[3px] pe-2 ps-2.5 text-[13px] font-semibold leading-[1.3] text-primary hover:bg-[hsl(182_40%_93%)]"
                  >
                    <RefreshCw className="size-[13px] shrink-0" aria-hidden="true" />
                    <span>
                      {t("drawer.convertedPrefix")}
                      <bdi
                        dir="ltr"
                        className={PH_SENSITIVE_PROPS.className}
                        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                      >
                        {formatConversionDetail(
                          selectedConversion.originalAmount,
                          selectedConversion.originalCurrency,
                          selectedConversion.rate,
                        )}
                      </bdi>
                    </span>
                  </Badge>
                ) : null}
              </div>
            ) : null}
            <DrawerDescription className="sr-only">
              {t("drawer.detailsDescription")}
            </DrawerDescription>
          </DrawerHeader>

          {selectedTransaction && (() => {
            const receiptVisible = showReceiptAction({
              platform,
              enabled: isAiIntakeEnabled(),
              expiresAt: selectedTransaction.receipt_expires_at,
            });
            const receiptUntil = selectedTransaction.receipt_expires_at
              ? formatDisplayDate(receiptExpiryDate(selectedTransaction.receipt_expires_at), "numeric").primary
              : "";
            const showUndoAi = 
              platform === "web" &&
              isAiIntakeEnabled() &&
              onUndoAi &&
              canUndoAiTransaction(selectedTransaction) &&
              (selectedTransaction.origin === "ai" || selectedTransaction.origin === "ai_auto");
            const displayDate = formatDisplayDate(selectedTransaction.date, "numeric");
            const categoryFamily = categoryFamilyOf(selectedTransaction.type);
            const categoryLabel = categoryFamily
              ? nonEmptyText(
                  formatCategory(
                    categoryFamily,
                    selectedTransaction.category,
                    i18n.language,
                    "",
                  ),
                )
              : null;
            const recipient = nonEmptyText(selectedTransaction.recipient);
            const paymentLabel = selectedTransaction.payment_method
              ? nonEmptyText(
                  formatPaymentMethod(
                    selectedTransaction.payment_method,
                    i18n.language,
                    "",
                  ),
                )
              : null;
            const showChomesh = trackChomeshSeparately && !!selectedTransaction.is_chomesh;
            const recurring = selectedTransaction.recurring_info;
            const canEditRecurring = Boolean(selectedTransaction.source_recurring_id);
            const recurringBadge = recurring ? (
              <span
                className={cn("inline-flex [&_svg]:!size-3", PH_SENSITIVE_PROPS.className)}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                <RecurringProgressBadge
                  status={recurring.status}
                  type={selectedTransaction.type}
                  executionCount={recurring.execution_count}
                  totalOccurrences={recurring.total_occurrences}
                  occurrenceNumber={selectedTransaction.occurrence_number}
                  frequency={recurring.frequency}
                  dayOfMonth={recurring.day_of_month}
                />
              </span>
            ) : null;
            const hasExtraActions = Boolean(
              receiptVisible || receiptLink || receiptNote || showUndoAi,
            );

            return (
            <div className="px-4">
              <div className="[&>*]:border-t [&>*]:border-border [&>*:last-child]:border-b">
                <DrawerField label={t("columns.date")}>
                  {drawerDateValue(displayDate.primary, displayDate.secondary)}
                </DrawerField>

                {categoryLabel ? (
                  <DrawerField label={t("columns.category")}>
                    {maskedDrawerValue(categoryLabel)}
                  </DrawerField>
                ) : null}

                {recipient ? (
                  <DrawerField label={t("columns.recipient")}>
                    {maskedDrawerValue(recipient)}
                  </DrawerField>
                ) : null}

                {paymentLabel ? (
                  <DrawerField label={t("columns.paymentMethod")}>
                    {maskedDrawerValue(paymentLabel)}
                  </DrawerField>
                ) : null}

                {showChomesh ? (
                  <DrawerField label={t("cards.chomesh")} maskLabel>
                    <div
                      className={cn(
                        "flex shrink-0 justify-end",
                        PH_SENSITIVE_PROPS.className,
                      )}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                    >
                      {formatBoolean(selectedTransaction.is_chomesh)}
                    </div>
                  </DrawerField>
                ) : null}

                {recurring && canEditRecurring && recurring.status !== "completed" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className={cn(
                      drawerRowClass,
                      "h-auto min-w-0 rounded-none px-0 font-normal shadow-none hover:bg-transparent hover:text-foreground",
                    )}
                    onClick={handleEditRecurring}
                    disabled={isFetchingRec}
                  >
                    <span className="shrink-0 text-[13px] font-normal leading-[1.3] text-muted-foreground">
                      {t("columns.recurring")}
                    </span>
                    <span className="flex min-w-0 items-center justify-end gap-2">
                      {recurringBadge}
                      <span className="inline-flex shrink-0 items-center gap-0.5 text-[15px] font-semibold leading-none text-primary">
                        {isFetchingRec ? t("messages.loading") : t("drawer.editRecurring")}
                        {isFetchingRec ? null : (
                          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        )}
                      </span>
                    </span>
                  </Button>
                ) : null}

                {recurring && (!canEditRecurring || recurring.status === "completed") ? (
                  <DrawerField label={t("columns.recurring")}>
                    {recurringBadge}
                  </DrawerField>
                ) : null}
              </div>

              {hasExtraActions ? (
              <div className="mt-3 space-y-3 pb-4">
              {receiptVisible && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => void handleOpenReceipt()}
                  aria-label={receiptUntil
                    ? `${t("actions.viewReceipt")}, ${t("actions.receiptUntil", { date: receiptUntil })}`
                    : t("actions.viewReceipt")}
                >
                  <Receipt className="me-2 h-4 w-4" />
                  <span>
                    {t("actions.viewReceipt")}
                    {receiptUntil ? ` · ${t("actions.receiptUntil", { date: receiptUntil })}` : ""}
                  </span>
                </Button>
              )}

              {receiptLink && (
                <a
                  className="block text-sm text-center underline"
                  href={receiptLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("filters.receiptOpen")}
                </a>
              )}

              {receiptNote && (
                <span className="block text-sm text-center text-muted-foreground">
                  {receiptNote}
                </span>
              )}

              {showUndoAi && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleUndoAi}
                >
                  <Undo2 className="me-2 h-4 w-4" />
                  {t("actions.undoAi")}
                </Button>
              )}
              </div>
              ) : null}
            </div>
            );
          })()}

          <DrawerFooter className="flex-row gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button variant="default" onClick={handleEdit} className="h-11 flex-1">
              <Edit3 className="me-2 h-4 w-4" />
              {t("actions.edit")}
            </Button>
            <Button
              variant="outline"
              onClick={handleDelete}
              className="h-11 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="me-2 h-4 w-4" />
              {t("actions.delete")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
