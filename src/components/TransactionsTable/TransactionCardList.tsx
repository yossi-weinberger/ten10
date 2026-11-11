import { useCallback, useMemo, useState, useRef, memo, useEffect } from "react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
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
import { Edit3, Repeat, Trash2, Undo2, Receipt, BadgeCheck } from "lucide-react";
import { Transaction, TransactionForTable, TransactionType } from "@/types/transaction";
import { cn } from "@/lib/utils/formatting";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { BASE_TYPE_SURFACE, baseTypeOf } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
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
  isCalendarMonthTransition,
} from "@/lib/calendar/calendar-period";
import { usePlatform } from "@/contexts/PlatformContext";
import { canUndoAiTransaction } from "@/lib/ai/ai-undo-eligibility";
import { isAiIntakeEnabled } from "@/lib/ai/flags";
import { openAiReceipt } from "@/lib/ai/open-receipt";
import { receiptExpiryDate, showReceiptAction } from "@/lib/ai/receipt-action";
import { useDonationStore } from "@/lib/store";
import { useLongPress } from "@/hooks/use-long-press";
import { useSwipe } from "@/hooks/use-swipe";
import { BulkActionsToolbar } from "./BulkActionsToolbar";

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
}

const isSpecialType = (type: TransactionType): boolean => {
  return type === "exempt-income" || 
         type === "recognized-expense" || 
         type === "non_tithe_donation" || 
         type === "initial_balance";
};

interface TransactionCardProps {
  transaction: TransactionForTable;
  displayDate: { primary: string | null };
  categoryText: string;
  cardTitle: string;
  surfaceClasses: string;
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
}

const TransactionCard = memo(function TransactionCard({
  transaction,
  displayDate,
  categoryText,
  cardTitle,
  surfaceClasses,
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
}: TransactionCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const swipeTriggeredRef = useRef(false);
  const isSwipeOpen = swipeOpenId === transaction.id;

  const ACTION_BUTTONS_WIDTH = 160;
  const SWIPE_THRESHOLD = 50;

  const isMobileSwipeEnabled = typeof window !== "undefined" 
    && typeof window.matchMedia === "function"
    && window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (!selectionDisabled && onToggleSelected) {
        longPressTriggeredRef.current = true;
        onToggleSelected(transaction.id);
      }
    },
    onCancel: () => {
      longPressTriggeredRef.current = false;
    },
    threshold: 450,
    movementThreshold: 10,
  });

  const swipeHandlers = useSwipe({
    onSwipeStart: () => {
      swipeTriggeredRef.current = true;
      setIsAnimating(false);
    },
    onSwipeMove: (offset) => {
      setSwipeOffset(Math.min(offset, ACTION_BUTTONS_WIDTH));
    },
    onSwipeEnd: (offset) => {
      setIsAnimating(true);
      if (offset >= SWIPE_THRESHOLD) {
        setSwipeOffset(ACTION_BUTTONS_WIDTH);
        onSwipeOpen(transaction.id);
      } else {
        setSwipeOffset(0);
        if (isSwipeOpen) {
          onSwipeClose();
        }
      }
      setTimeout(() => {
        swipeTriggeredRef.current = false;
      }, 100);
    },
    threshold: SWIPE_THRESHOLD,
    movementThreshold: 10,
    isRTL,
    disabled: inSelectionMode || !isMobileSwipeEnabled,
  });

  const effectiveSwipeOffset = (isSwipeOpen && isMobileSwipeEnabled) ? swipeOffset : 0;

  const handlePointerDown = (e: React.PointerEvent) => {
    longPressTriggeredRef.current = false;
    swipeTriggeredRef.current = false;
    longPressHandlers.onPointerDown(e);
    swipeHandlers.onPointerDown(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    longPressHandlers.onPointerMove(e);
    swipeHandlers.onPointerMove(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    const wasSwipeActive = swipeTriggeredRef.current;
    longPressHandlers.onPointerUp();
    swipeHandlers.onPointerUp(e);
    
    if (wasSwipeActive && inSelectionMode) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handlePointerCancel = () => {
    longPressTriggeredRef.current = false;
    const wasSwipeActive = swipeTriggeredRef.current;
    swipeTriggeredRef.current = false;
    longPressHandlers.onPointerCancel();
    swipeHandlers.onPointerCancel();
    
    if (wasSwipeActive) {
      setSwipeOffset(0);
      setIsAnimating(true);
      if (isSwipeOpen) {
        onSwipeClose();
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    const isTouch = (e.nativeEvent instanceof PointerEvent && e.nativeEvent.pointerType === "touch") 
      || window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) {
      e.preventDefault();
    }
  };

  const handleCardClick = () => {
    if (swipeTriggeredRef.current || longPressTriggeredRef.current) {
      swipeTriggeredRef.current = false;
      longPressTriggeredRef.current = false;
      return;
    }
    if (inSelectionMode && swipeOffset > 0) {
      return;
    }
    onCardClick(transaction);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(transaction);
    onSwipeClose();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(transaction);
    onSwipeClose();
  };

  return (
    <div className="relative max-md:[@media(pointer:coarse)]:overflow-hidden">
      <div
        className="max-md:[@media(pointer:coarse)]:absolute max-md:[@media(pointer:coarse)]:inset-y-0 max-md:[@media(pointer:coarse)]:end-0 max-md:[@media(pointer:coarse)]:flex max-md:[@media(pointer:coarse)]:items-center max-md:[@media(pointer:coarse)]:gap-2 max-md:[@media(pointer:coarse)]:pe-3 hidden"
        aria-hidden={!isSwipeOpen}
      >
        <Button
          variant="default"
          size="icon"
          className="h-11 w-11 min-w-[44px] min-h-[44px]"
          onClick={handleEditClick}
          tabIndex={isSwipeOpen ? 0 : -1}
          aria-label={t("actions.edit")}
        >
          <Edit3 className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 min-w-[44px] min-h-[44px] text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleDeleteClick}
          tabIndex={isSwipeOpen ? 0 : -1}
          aria-label={t("actions.delete")}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
      <Card
        role="button"
        tabIndex={0}
        aria-selected={inSelectionMode ? isSelected : undefined}
        aria-pressed={inSelectionMode ? isSelected : undefined}
        className={cn(
          "flex min-h-[64px] cursor-pointer items-center gap-3 p-3 transition-all hover:shadow-md active:scale-[0.99] select-none [-webkit-touch-callout:none] max-md:[@media(pointer:coarse)]:touch-pan-y",
          surfaceClasses,
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
        style={{
          transform: `translateX(${isRTL ? effectiveSwipeOffset : -effectiveSwipeOffset}px)`,
          transition: isAnimating || !isSwipeOpen ? "transform 0.3s ease-out" : "none",
        }}
        onClick={handleCardClick}
        onKeyDown={onKeyDown}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="flex-1 overflow-hidden">
          <div
            className={cn(
              "truncate font-medium",
              !transaction.description && "text-muted-foreground",
              PH_SENSITIVE_PROPS.className
            )}
            data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
          >
            {cardTitle}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{displayDate.primary}</span>
            {categoryText && (
              <>
                <span>·</span>
                <span
                  className={cn(
                    "truncate",
                    PH_SENSITIVE_PROPS.className
                  )}
                  data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                >
                  {categoryText}
                </span>
              </>
            )}
            {transaction.recurring_info && (
              <>
                <span>·</span>
                <Repeat className="h-3 w-3" aria-hidden="true" />
              </>
            )}
            {isSpecialType(transaction.type) && (
              <Badge
                variant="outline"
                className={cn(
                  "h-5 border px-1.5 py-0 text-[10px]",
                  typeBadgeColors[transaction.type as TransactionType]
                )}
              >
                {t(`types.${transaction.type}`, transaction.type)}
              </Badge>
            )}
            {trackChomeshSeparately && transaction.is_chomesh && (
              <span className="inline-flex items-center gap-0.5 text-[10px]">
                <BadgeCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
                <span>{t("cards.chomesh")}</span>
              </span>
            )}
          </div>
        </div>
        <div
          className={cn(
            "shrink-0 text-end font-bold",
            PH_SENSITIVE_PROPS.className
          )}
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
          />
        </div>
      </Card>
    </div>
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
}: TransactionCardListProps) {
  const { t, i18n } = useTranslation("data-tables");
  const formatDisplayDate = useDisplayDate();
  const calendarType = useEffectiveCalendarType();
  const { platform } = usePlatform();
  const trackChomeshSeparately = useDonationStore(
    (state) => state.settings.trackChomeshSeparately,
  );
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionForTable | null>(null);
  const [receiptNote, setReceiptNote] = useState<string | null>(null);
  const [receiptLink, setReceiptLink] = useState<string | null>(null);
  const longPressTriggeredRef = useRef(false);
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);

  const inSelectionMode = selectedIds.size > 0;
  const computedSwipeOpenId = inSelectionMode ? null : swipeOpenId;

  React.useEffect(() => {
    if (inSelectionMode) {
      document.body.dataset.mobileSelectionActive = "true";
    } else {
      delete document.body.dataset.mobileSelectionActive;
    }
    return () => {
      delete document.body.dataset.mobileSelectionActive;
    };
  }, [inSelectionMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (computedSwipeOpenId && !(e.target as Element).closest('[role="button"]')) {
        setSwipeOpenId(null);
      }
    };

    const handleScroll = () => {
      if (computedSwipeOpenId) {
        setSwipeOpenId(null);
      }
    };

    if (computedSwipeOpenId) {
      document.addEventListener("click", handleClickOutside, true);
      window.addEventListener("scroll", handleScroll, true);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [computedSwipeOpenId]);

  const transactionsWithSeparators = useMemo(() => {
    const result: Array<
      | { type: "transaction"; transaction: TransactionForTable }
      | { type: "separator"; monthKey: string; monthLabel: string }
    > = [];

    let previousMonthKey: string | null = null;

    transactions.forEach((transaction, index) => {
      const currentMonthKey = getCalendarMonthKey(
        transaction.date,
        calendarType,
      );

      if (
        index === 0 ||
        isCalendarMonthTransition(
          previousMonthKey,
          transaction.date,
          calendarType,
        )
      ) {
        result.push({
          type: "separator",
          monthKey: currentMonthKey,
          monthLabel: formatCalendarMonthLabel(
            currentMonthKey,
            calendarType,
            i18n.language,
          ),
        });
      }

      result.push({
        type: "transaction",
        transaction,
      });

      previousMonthKey = currentMonthKey;
    });

    return result;
  }, [transactions, i18n.language, calendarType]);

  const handleCardClick = useCallback((transaction: TransactionForTable) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    if (inSelectionMode && onToggleSelected) {
      onToggleSelected(transaction.id);
      return;
    }

    setSelectedTransaction(transaction);
  }, [inSelectionMode, onToggleSelected]);

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

  const handleSwipeOpen = useCallback((id: string) => {
    setSwipeOpenId(id);
  }, []);

  const handleSwipeClose = useCallback(() => {
    setSwipeOpenId(null);
  }, []);

  if (loading && transactions.length === 0) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, index) => (
          <Card
            key={`skeleton-${index}`}
            className="h-16 animate-pulse bg-muted"
          />
        ))}
      </div>
    );
  }

  if (!loading && transactions.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        {t("messages.noData")}
      </div>
    );
  }

  return (
    <>
      {inSelectionMode && onClearSelection && onSelectionEdit && onSelectionDelete && 
       selectedCountLabel && editLabel && deleteLabel && clearLabel && bulkToolbarAriaLabel && (
        <BulkActionsToolbar
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
          className="md:mb-4 max-md:fixed max-md:inset-x-3 max-md:bottom-[calc(12px+env(safe-area-inset-bottom))] max-md:z-40 max-md:rounded-2xl max-md:bg-background max-md:shadow-lg max-md:border max-md:border-border max-md:p-3"
          mobileLayout
        />
      )}
      <div className={cn("space-y-2", inSelectionMode && "max-md:pb-24")}>
        {transactionsWithSeparators.map((item) => {
          if (item.type === "separator") {
            return (
              <div
                key={`month-separator-${item.monthKey}`}
                className="sticky top-0 z-10 bg-background py-2 text-xs font-medium text-muted-foreground"
              >
                {item.monthLabel}
              </div>
            );
          }

          const transaction = item.transaction;
          const baseType = baseTypeOf(transaction.type);
          const surfaceClasses = BASE_TYPE_SURFACE[baseType];
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
              surfaceClasses={surfaceClasses}
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
            />
          );
        })}
      </div>

      <Drawer open={!!selectedTransaction} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <DrawerContent dir={i18n.dir()}>
          <DrawerHeader className="text-start">
            <DrawerTitle
              className={cn(PH_SENSITIVE_PROPS.className)}
              data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
            >
              {selectedTransaction?.description || t("messages.defaultTransactionName")}
            </DrawerTitle>
            {selectedTransaction && (
              <div
                className={cn(
                  "mt-2 text-2xl font-bold",
                  PH_SENSITIVE_PROPS.className
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
                />
              </div>
            )}
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

            return (
            <div className="space-y-3 px-4 pb-4">
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("columns.date")}</span>
                  <span className="font-medium">
                    {(() => {
                      const displayDate = formatDisplayDate(selectedTransaction.date, "numeric");
                      return displayDate.secondary
                        ? `${displayDate.primary} (${displayDate.secondary})`
                        : displayDate.primary;
                    })()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("columns.type")}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border",
                      typeBadgeColors[selectedTransaction.type]
                    )}
                  >
                    {t(`types.${selectedTransaction.type}`, selectedTransaction.type)}
                  </Badge>
                </div>

                {selectedTransaction.category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("columns.category")}</span>
                    <span
                      className={cn(PH_SENSITIVE_PROPS.className)}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                    >
                      {formatCategory(
                        selectedTransaction.type === "income" || selectedTransaction.type === "exempt-income" ? "income"
                          : selectedTransaction.type === "expense" || selectedTransaction.type === "recognized-expense" ? "expense"
                          : undefined,
                        selectedTransaction.category,
                        i18n.language,
                        ""
                      )}
                    </span>
                  </div>
                )}

                {selectedTransaction.recipient && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("columns.recipient")}</span>
                    <span
                      className={cn(PH_SENSITIVE_PROPS.className)}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                    >
                      {selectedTransaction.recipient}
                    </span>
                  </div>
                )}

                {selectedTransaction.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("columns.paymentMethod")}</span>
                    <span
                      className={cn(PH_SENSITIVE_PROPS.className)}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                    >
                      {formatPaymentMethod(
                        selectedTransaction.payment_method,
                        i18n.language,
                        ""
                      )}
                    </span>
                  </div>
                )}

                {trackChomeshSeparately && selectedTransaction.is_chomesh && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("columns.chomesh")}</span>
                    <span>{formatBoolean(selectedTransaction.is_chomesh)}</span>
                  </div>
                )}

                {selectedTransaction.recurring_info && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("columns.recurring")}</span>
                    <RecurringProgressBadge
                      status={selectedTransaction.recurring_info.status}
                      type={selectedTransaction.type}
                      executionCount={selectedTransaction.recurring_info.execution_count}
                      totalOccurrences={selectedTransaction.recurring_info.total_occurrences}
                      occurrenceNumber={selectedTransaction.occurrence_number}
                      frequency={selectedTransaction.recurring_info.frequency}
                      dayOfMonth={selectedTransaction.recurring_info.day_of_month}
                    />
                  </div>
                )}
              </div>

              {selectedTransaction.source_recurring_id && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleEditRecurring}
                  disabled={
                    isFetchingRec ||
                    selectedTransaction.recurring_info?.status === "completed"
                  }
                >
                  <Repeat className="me-2 h-4 w-4" />
                  {isFetchingRec
                    ? t("messages.loading")
                    : t("actions.editRecurring")}
                </Button>
              )}

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
            );
          })()}

          <DrawerFooter className="flex-row gap-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
