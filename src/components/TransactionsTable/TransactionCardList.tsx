import { useCallback, useEffect, useMemo, useState, useRef, memo } from "react";
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
import { BadgeCheck, CalendarClock, Coins, Edit3, Receipt, Trash2, Undo2 } from "lucide-react";
import { Transaction, TransactionForTable, TransactionType } from "@/types/transaction";
import { cn } from "@/lib/utils/formatting";
import { formatCurrency, hasStoredCurrencyConversion } from "@/lib/utils/currency";
import type { CurrencyCode } from "@/lib/currencies";
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
  const { i18n } = useTranslation("data-tables");
  const conversion = storedConversion(transaction);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const swipeTriggeredRef = useRef(false);
  const dragBaseRef = useRef(0);
  if (inSelectionMode && isDragging) {
    setIsDragging(false);
  }
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionButtonsWidth, setActionButtonsWidth] = useState(128);
  const isSwipeOpen = swipeOpenId === transaction.id;
  const actionsInteractive = isSwipeOpen && !inSelectionMode;

  const SWIPE_THRESHOLD = 50;

  const isMobileSwipeEnabled = typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;

  useEffect(() => {
    if (isMobileSwipeEnabled && actionsRef.current) {
      const width = actionsRef.current.offsetWidth;
      if (width > 0) {
        setActionButtonsWidth(width);
      }
    }
  }, [isMobileSwipeEnabled]);

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
      setIsDragging(true);
      dragBaseRef.current = isSwipeOpen ? swipeOffset : 0;
      swipeTriggeredRef.current = true;
      setIsAnimating(false);
    },
    onSwipeMove: (delta) => {
      const next = Math.min(Math.max(dragBaseRef.current + delta, 0), actionButtonsWidth);
      setSwipeOffset(next);
    },
    onSwipeEnd: (delta) => {
      setIsDragging(false);
      setIsAnimating(true);
      const blocked = inSelectionMode || !isMobileSwipeEnabled;
      const next = blocked
        ? 0
        : Math.min(Math.max(dragBaseRef.current + delta, 0), actionButtonsWidth);
      if (!blocked && next >= SWIPE_THRESHOLD) {
        setSwipeOffset(actionButtonsWidth);
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

  const effectiveSwipeOffset =
    isMobileSwipeEnabled && !inSelectionMode && (isDragging || isSwipeOpen)
      ? swipeOffset
      : 0;

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
    longPressHandlers.onPointerUp(e);
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
    setIsDragging(false);
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
    onCardClick(transaction);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!actionsInteractive) return;
    onEdit(transaction);
    onSwipeClose();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!actionsInteractive) return;
    onDelete(transaction);
    onSwipeClose();
  };

  return (
    <div
      className="relative max-md:[@media(pointer:coarse)]:overflow-hidden"
      data-swipe-row={transaction.id}
    >
      <div
        ref={actionsRef}
        className={cn(
          "max-md:[@media(pointer:coarse)]:absolute max-md:[@media(pointer:coarse)]:inset-y-0 max-md:[@media(pointer:coarse)]:end-0 max-md:[@media(pointer:coarse)]:z-[2] max-md:[@media(pointer:coarse)]:flex max-md:[@media(pointer:coarse)]:items-stretch max-md:[@media(pointer:coarse)]:gap-2 max-md:[@media(pointer:coarse)]:ps-2 hidden",
          effectiveSwipeOffset === 0 && "max-md:[@media(pointer:coarse)]:invisible",
          !actionsInteractive && "pointer-events-none"
        )}
        aria-hidden={!actionsInteractive}
      >
        <Button
          variant="default"
          size="icon"
          className="h-full w-14 min-w-[44px] rounded-lg flex-col gap-0.5 [&_svg]:size-5"
          onClick={handleEditClick}
          tabIndex={actionsInteractive ? 0 : -1}
          disabled={!actionsInteractive}
          aria-label={t("actions.edit")}
        >
          <Edit3 className="h-5 w-5" />
          <span className="text-[11px] leading-tight">{t("actions.edit")}</span>
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-full w-14 min-w-[44px] rounded-lg flex-col gap-0.5 [&_svg]:size-5"
          onClick={handleDeleteClick}
          tabIndex={actionsInteractive ? 0 : -1}
          disabled={!actionsInteractive}
          aria-label={t("actions.delete")}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[11px] leading-tight">{t("actions.delete")}</span>
        </Button>
      </div>
      <Card
        role="button"
        tabIndex={0}
        aria-selected={inSelectionMode ? isSelected : undefined}
        aria-pressed={inSelectionMode ? isSelected : undefined}
        className={cn(
          "flex min-h-[64px] cursor-pointer items-center gap-3 p-3 hover:shadow-md active:scale-[0.99] select-none [-webkit-touch-callout:none] max-md:[@media(pointer:coarse)]:touch-pan-y max-md:[@media(pointer:coarse)]:relative max-md:[@media(pointer:coarse)]:z-[1]",
          surfaceClasses,
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
        style={{
          marginInlineEnd: isMobileSwipeEnabled && effectiveSwipeOffset > 0
            ? `${effectiveSwipeOffset}px`
            : undefined,
          transition: isAnimating ? "margin 0.3s ease-out" : "none",
        }}
        onClick={handleCardClick}
        onKeyDown={onKeyDown}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
      <div className="flex-1 min-w-0 overflow-hidden">
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
          <span
            className={cn(PH_SENSITIVE_PROPS.className)}
            data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
          >
            {displayDate.primary}
          </span>
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
              <span
                className={cn(PH_SENSITIVE_PROPS.className)}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                <CalendarClock className="h-3 w-3" aria-hidden="true" />
              </span>
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
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[10px]",
                PH_SENSITIVE_PROPS.className
              )}
              data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
            >
              <BadgeCheck className="h-5 w-5 text-green-600" aria-hidden="true" />
              <span
                className={cn(PH_SENSITIVE_PROPS.className)}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                {t("cards.chomesh")}
              </span>
            </span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "shrink-0 text-end font-bold",
          conversion && "flex flex-col items-end",
          PH_SENSITIVE_PROPS.className
        )}
        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
      >
        {conversion ? (
          <div className="flex items-center justify-end gap-1">
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
            <Coins className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          </div>
        ) : (
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
        )}
        {conversion ? (
          <span
            className={cn(
              "text-xs font-normal text-muted-foreground",
              PH_SENSITIVE_PROPS.className
            )}
            data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
          >
            {formatCurrency(
              conversion.originalAmount,
              conversion.originalCurrency,
              i18n.language
            )}
          </span>
        ) : null}
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
  const { t: tCurrency } = useTranslation("currency-features");
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
  if (inSelectionMode && swipeOpenId !== null) {
    setSwipeOpenId(null);
  }
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
      if (!computedSwipeOpenId) return;
      const target = e.target;
      if (target instanceof Element) {
        const row = target.closest("[data-swipe-row]");
        if (row?.getAttribute("data-swipe-row") === computedSwipeOpenId) return;
      }
      setSwipeOpenId(null);
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

  const selectedConversion = selectedTransaction
    ? storedConversion(selectedTransaction)
    : null;

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
                className="sticky top-[var(--mobile-topbar-h,0px)] z-10 bg-background py-2 text-xs font-medium text-muted-foreground"
              >
                <span
                  className={cn(PH_SENSITIVE_PROPS.className)}
                  data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                >
                  {item.monthLabel}
                </span>
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
                  selectedConversion && "flex items-center justify-center gap-1",
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
                  showConversionIcon={!selectedConversion}
                />
                {selectedConversion ? (
                  <Coins className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                ) : null}
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
                  <span
                    className={cn("font-medium", PH_SENSITIVE_PROPS.className)}
                    data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                  >
                    {(() => {
                      const displayDate = formatDisplayDate(selectedTransaction.date, "numeric");
                      return displayDate.secondary
                        ? `${displayDate.primary} (${displayDate.secondary})`
                        : displayDate.primary;
                    })()}
                  </span>
                </div>

                {selectedConversion && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tCurrency("row.tooltip.original")}</span>
                      <span
                        className={cn("font-medium", PH_SENSITIVE_PROPS.className)}
                        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                      >
                        {formatCurrency(
                          selectedConversion.originalAmount,
                          selectedConversion.originalCurrency,
                          i18n.language
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tCurrency("row.tooltip.rate")}</span>
                      <span
                        className={cn("font-medium", PH_SENSITIVE_PROPS.className)}
                        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                      >
                        {selectedConversion.rate?.toFixed(2) || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tCurrency("row.tooltip.converted")}</span>
                      <span
                        className={cn("font-medium", PH_SENSITIVE_PROPS.className)}
                        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                      >
                        {formatCurrency(
                          selectedTransaction.amount,
                          selectedTransaction.currency,
                          i18n.language
                        )}
                      </span>
                    </div>
                  </>
                )}

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
                    <span
                      className={cn(
                        "text-muted-foreground",
                        PH_SENSITIVE_PROPS.className
                      )}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                    >
                      {t("columns.chomesh")}
                    </span>
                    <span
                      className={cn(PH_SENSITIVE_PROPS.className)}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                    >
                      {formatBoolean(selectedTransaction.is_chomesh)}
                    </span>
                  </div>
                )}

                {selectedTransaction.recurring_info && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("columns.recurring")}</span>
                    <span
                      className={cn(PH_SENSITIVE_PROPS.className)}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                    >
                      <RecurringProgressBadge
                        status={selectedTransaction.recurring_info.status}
                        type={selectedTransaction.type}
                        executionCount={selectedTransaction.recurring_info.execution_count}
                        totalOccurrences={selectedTransaction.recurring_info.total_occurrences}
                        occurrenceNumber={selectedTransaction.occurrence_number}
                        frequency={selectedTransaction.recurring_info.frequency}
                        dayOfMonth={selectedTransaction.recurring_info.day_of_month}
                      />
                    </span>
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
                  <CalendarClock className="me-2 h-4 w-4" />
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
