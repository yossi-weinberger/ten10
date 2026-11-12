import { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef, memo } from "react";
import * as React from "react";
import { useReducedMotion } from "framer-motion";
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
import { BadgeCheck, CalendarClock, ChevronRight, Coins, Edit3, Receipt, RefreshCw, Trash2, Undo2 } from "lucide-react";
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

const SWIPE_ACTION_FALLBACK_WIDTH = 128;
const SWIPE_OPEN_THRESHOLD = 50;
const SWIPE_RELEASE_MS = 200;

// More than one strip can be revealed during a handoff between cards.
let revealedSwipeStrips = 0;

function setSwipeStripCover(active: boolean): void {
  revealedSwipeStrips = Math.max(0, revealedSwipeStrips + (active ? 1 : -1));
  if (revealedSwipeStrips > 0) {
    document.body.dataset.mobileSwipeOpen = "true";
  } else {
    delete document.body.dataset.mobileSwipeOpen;
  }
}

function clampOpenOffset(value: number, width: number): number {
  return Math.min(Math.max(value, 0), width);
}

// Positive openOffset reveals inline-end actions. LTR content moves left;
// RTL content moves right, so the same offset is mirrored.
function contentTranslateX(openOffset: number, isRTL: boolean): number {
  return isRTL ? openOffset : -openOffset;
}

function parseTranslateX(transform: string): number | null {
  if (!transform || transform === "none") return null;
  const translate = /translate(?:3d|X)\(\s*([-\d.]+)px/.exec(transform);
  if (translate) return Number(translate[1]);
  const matrix = /matrix(?:3d)?\(([^)]+)\)/.exec(transform);
  if (!matrix) return null;
  const parts = matrix[1].split(",").map((part) => Number(part.trim()));
  const value = parts.length === 16 ? parts[12] : parts[4];
  return Number.isFinite(value) ? value : null;
}

// Prefer the painted position. Falling back to the specified transform covers
// environments that do not interpolate transitions.
function visualOpenOffset(el: HTMLElement, isRTL: boolean, width: number): number {
  const painted = parseTranslateX(window.getComputedStyle(el).transform);
  const specified = parseTranslateX(el.style.transform);
  const x = painted ?? specified ?? 0;
  return clampOpenOffset(isRTL ? x : -x, width);
}

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
  const [isDragging, setIsDragging] = useState(false);
  const swipeTriggeredRef = useRef(false);
  const dragBaseRef = useRef(0);
  if (inSelectionMode && isDragging) {
    setIsDragging(false);
  }
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionButtonsWidth, setActionButtonsWidth] = useState(SWIPE_ACTION_FALLBACK_WIDTH);
  const isSwipeOpen = swipeOpenId === transaction.id;
  // Inert only while the row is closed. Dragging or open stays opaque and
  // clickable; disabled would fade the buttons.
  const actionsInert = inSelectionMode || (!isDragging && !isSwipeOpen);
  const reduceMotion = useReducedMotion();

  const isMobileSwipeEnabled = typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;

  const logicalOffset =
    isMobileSwipeEnabled && !inSelectionMode && (isDragging || isSwipeOpen)
      ? swipeOffset
      : 0;
  const targetX = isMobileSwipeEnabled ? contentTranslateX(logicalOffset, isRTL) : 0;
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const renderedXRef = useRef(targetX);
  // Hidden at rest. A close keeps the strip painted until the release ends,
  // while pointer events and aria-hidden drop immediately via actionsInert.
  const [actionsHidden, setActionsHidden] = useState(true);
  const rowClosed = !isDragging && !isSwipeOpen;
  if (!rowClosed && actionsHidden) {
    setActionsHidden(false);
  }
  const actionsConcealed = actionsHidden && rowClosed;

  useEffect(() => {
    if (actionsConcealed) return;
    setSwipeStripCover(true);
    return () => setSwipeStripCover(false);
  }, [actionsConcealed]);

  // A transition added in the same commit as translateX does not run. Rewind
  // to the painted offset, flush layout, then ease. The no-ease branch still
  // writes translateX: React skips the style prop when the string is unchanged,
  // which leaves an interrupted drag pinned off the finger.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) {
      renderedXRef.current = targetX;
      return;
    }
    const releaseInFlight = el.style.transition.includes("transform");
    const painted = releaseInFlight
      ? parseTranslateX(window.getComputedStyle(el).transform)
      : null;
    const from = painted ?? renderedXRef.current;
    renderedXRef.current = targetX;
    const shouldEase = !isDragging && reduceMotion === false && from !== targetX;
    const closed = !isDragging && !isSwipeOpen;
    if (!shouldEase) {
      el.style.transition = isDragging || reduceMotion !== false ? "none" : "";
      el.style.transform = `translateX(${targetX}px)`;
      if (!closed) return;
      const hide = window.setTimeout(() => setActionsHidden(true), 0);
      return () => window.clearTimeout(hide);
    }
    el.style.transition = "none";
    el.style.transform = `translateX(${from}px)`;
    void el.getBoundingClientRect();
    el.style.transition = `transform ${SWIPE_RELEASE_MS}ms ease-out`;
    el.style.transform = `translateX(${targetX}px)`;
    const timer = window.setTimeout(() => {
      el.style.transition = "";
      if (closed) setActionsHidden(true);
    }, SWIPE_RELEASE_MS);
    return () => window.clearTimeout(timer);
  }, [isDragging, isSwipeOpen, reduceMotion, targetX]);

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
      const el = contentRef.current;
      const visualOffset = el
        ? visualOpenOffset(el, isRTL, actionButtonsWidth)
        : (isSwipeOpen ? swipeOffset : 0);
      const pinnedX = contentTranslateX(visualOffset, isRTL);
      dragBaseRef.current = visualOffset;
      renderedXRef.current = pinnedX;
      if (el) {
        el.style.transition = "none";
        el.style.transform = `translateX(${pinnedX}px)`;
      }
      setSwipeOffset(visualOffset);
      setIsDragging(true);
      swipeTriggeredRef.current = true;
    },
    onSwipeMove: (delta) => {
      const next = clampOpenOffset(dragBaseRef.current + delta, actionButtonsWidth);
      setSwipeOffset(next);
    },
    onSwipeEnd: (delta) => {
      setIsDragging(false);
      const blocked = inSelectionMode || !isMobileSwipeEnabled;
      const next = blocked
        ? 0
        : clampOpenOffset(dragBaseRef.current + delta, actionButtonsWidth);
      if (!blocked && next >= SWIPE_OPEN_THRESHOLD) {
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
    threshold: SWIPE_OPEN_THRESHOLD,
    movementThreshold: 10,
    isRTL,
    disabled: inSelectionMode || !isMobileSwipeEnabled,
  });

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
    if (isSwipeOpen) {
      onSwipeClose();
      return;
    }
    onCardClick(transaction);
  };

  const releaseStripFocus = () => {
    const active = document.activeElement;
    if (active instanceof Node && actionsRef.current?.contains(active)) {
      cardRef.current?.focus();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionsInert) return;
    onEdit(transaction);
    onSwipeClose();
    releaseStripFocus();
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (actionsInert) return;
    onDelete(transaction);
    onSwipeClose();
    releaseStripFocus();
  };

  const card = (
      <Card
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-selected={inSelectionMode ? isSelected : undefined}
        aria-pressed={inSelectionMode ? isSelected : undefined}
        className={cn(
          "flex min-h-[64px] cursor-pointer items-center gap-3 p-3 hover:shadow-md active:scale-[0.99] select-none [-webkit-touch-callout:none] max-md:[@media(pointer:coarse)]:touch-pan-y",
          surfaceClasses,
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
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
            <Coins className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
  );

  return (
    <div
      className="relative max-md:[@media(pointer:coarse)]:isolate max-md:[@media(pointer:coarse)]:overflow-hidden"
      data-swipe-row={transaction.id}
    >
      <div
        ref={actionsRef}
        className={cn(
          "hidden max-md:[@media(pointer:coarse)]:absolute max-md:[@media(pointer:coarse)]:inset-y-0 max-md:[@media(pointer:coarse)]:end-0 max-md:[@media(pointer:coarse)]:z-0 max-md:[@media(pointer:coarse)]:flex max-md:[@media(pointer:coarse)]:items-stretch max-md:[@media(pointer:coarse)]:gap-2 max-md:[@media(pointer:coarse)]:ps-2",
          actionsConcealed && "max-md:[@media(pointer:coarse)]:invisible",
          actionsInert && "pointer-events-none"
        )}
        aria-hidden={actionsInert}
      >
        <Button
          variant="default"
          size="icon"
          className="h-full w-14 min-w-[44px] rounded-lg flex-col gap-0.5 [&_svg]:size-5"
          onClick={handleEditClick}
          tabIndex={actionsInert ? -1 : 0}
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
          tabIndex={actionsInert ? -1 : 0}
          aria-label={t("actions.delete")}
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-[11px] leading-tight">{t("actions.delete")}</span>
        </Button>
      </div>
      {isMobileSwipeEnabled ? (
        <div
          ref={contentRef}
          className={cn(
            "relative z-10",
            !isDragging && reduceMotion === false && "transition-transform duration-200 ease-out"
          )}
          style={{ transform: `translateX(${targetX}px)` }}
        >
          {card}
        </div>
      ) : (
        card
      )}
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
  showMonthSeparators = true,
  sortControl,
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
    if (!showMonthSeparators) {
      return transactions.map((transaction) => ({
        type: "transaction" as const,
        transaction,
      }));
    }

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
  }, [transactions, i18n.language, calendarType, showMonthSeparators]);

  let firstSeparatorKey: string | undefined;
  for (const item of transactionsWithSeparators) {
    if (item.type === "separator") {
      firstSeparatorKey = item.monthKey;
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
        {sortRow}
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
      <div>
        {sortRow}
        <div className="py-12 text-center text-muted-foreground">
          {t("messages.noData")}
        </div>
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
        {chipOnFirstSeparator ? null : sortRow}
        {transactionsWithSeparators.map((item) => {
          if (item.type === "separator") {
            const placeChip =
              chipOnFirstSeparator && item.monthKey === firstSeparatorKey;
            return (
              <div
                key={`month-separator-${item.monthKey}`}
                data-sort-chip-slot={placeChip ? "separator" : undefined}
                className={cn(
                  "sticky top-[var(--mobile-topbar-h,0px)] z-10 bg-background py-2 text-xs font-medium text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    PH_SENSITIVE_PROPS.className,
                    placeChip && "me-48 block max-w-[calc(100%-12rem)] truncate",
                  )}
                  data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                >
                  {item.monthLabel}
                </span>
                {placeChip ? (
                  <div className="absolute end-0 top-1/2 z-10 -translate-y-1/2">
                    {sortControl}
                  </div>
                ) : null}
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
          <DrawerHeader className="flex flex-col gap-0 p-4 pb-3 text-start sm:text-start">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <DrawerTitle
                className={cn(
                  "min-w-0 flex-1 break-words text-start font-semibold leading-[1.2] tracking-[-0.01em] line-clamp-2",
                  PH_SENSITIVE_PROPS.className,
                )}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                {selectedTransaction?.description || t("messages.defaultTransactionName")}
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
