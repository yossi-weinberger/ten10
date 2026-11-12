import { useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Coins, Edit3, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CurrencyConversionInfo } from "@/components/Currency/CurrencyConversionInfo";
import { CardListStates } from "@/components/card-list/CardListStates";
import { groupWithSeparators } from "@/components/card-list/group-with-separators";
import { MobileBulkToolbar } from "@/components/card-list/MobileBulkToolbar";
import { StickyGroupHeader } from "@/components/card-list/StickyGroupHeader";
import { SwipeableCardRow } from "@/components/card-list/SwipeableCardRow";
import {
  AmountPanel,
  MOBILE_NEUTRAL_CARD_HEIGHT_CLASS,
  MOBILE_NEUTRAL_CARD_PAD_CLASS,
  TypeIconChip,
} from "@/components/card-list/TypeVisual";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { formatCategory } from "@/lib/category-registry";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { formatPaymentMethod } from "@/lib/payment-methods";
import { formatCurrency, hasStoredCurrencyConversion } from "@/lib/utils/currency";
import { useDonationStore } from "@/lib/store";
import { MOBILE_SELECTION_CLEARANCE_CLASS } from "@/lib/responsive";
import { cn, formatBoolean } from "@/lib/utils/formatting";
import { useMobileSelectionBodyFlag } from "@/hooks/useMobileSelectionBodyFlag";
import { useRestoreOverlayOnUnmount } from "@/hooks/useRestoreOverlayOnUnmount";
import { useSwipeOpenRow } from "@/hooks/useSwipeOpenRow";
import type { Currency, RecurringTransaction, TransactionType } from "@/types/transaction";
import { recurringStatusBadgeColors } from "@/types/recurringTransactionLabels";
import { typeBadgeColors } from "@/types/transactionLabels";
import { RecurringProgressBadge } from "./RecurringProgressBadge";

const STATUS_ORDER = ["active", "paused", "completed", "cancelled"] as const;

const CARD_SURFACE_CLASS = cn(
  MOBILE_NEUTRAL_CARD_HEIGHT_CLASS,
  MOBILE_NEUTRAL_CARD_PAD_CLASS,
  "overflow-hidden bg-white dark:bg-card",
);

const drawerRowClass =
  "flex min-h-11 w-full items-center justify-between gap-3 border-t border-border py-2 text-start";
const drawerValueClass =
  "min-w-0 truncate text-end text-[15px] font-medium leading-[1.3]";

export interface RecurringCardListProps {
  recurring: RecurringTransaction[];
  loading?: boolean;
  error?: string | null;
  sortControl?: ReactNode;
  onEdit: (transaction: RecurringTransaction) => void;
  onDelete: (transaction: RecurringTransaction) => void;
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

function groupRecurringByStatus(
  rows: readonly RecurringTransaction[],
): RecurringTransaction[] {
  const buckets = new Map<string, RecurringTransaction[]>();
  for (const row of rows) {
    const bucket = buckets.get(row.status);
    if (bucket) {
      bucket.push(row);
    } else {
      buckets.set(row.status, [row]);
    }
  }

  const ordered: RecurringTransaction[] = [];
  for (const status of STATUS_ORDER) {
    const bucket = buckets.get(status);
    if (!bucket) continue;
    ordered.push(...bucket);
    buckets.delete(status);
  }
  for (const bucket of buckets.values()) {
    ordered.push(...bucket);
  }
  return ordered;
}

function categoryFamilyOf(type: TransactionType): "income" | "expense" | null {
  switch (type) {
    case "income":
    case "exempt-income":
    case "initial_balance":
      return "income";
    case "expense":
    case "recognized-expense":
      return "expense";
    case "donation":
    case "non_tithe_donation":
      return null;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function nonEmptyText(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function storedConversion(row: RecurringTransaction): {
  originalAmount: number;
  originalCurrency: Currency;
  rate: number | null | undefined;
} | null {
  if (
    row.original_amount == null ||
    row.original_currency == null ||
    !hasStoredCurrencyConversion({
      amount: row.amount,
      currency: row.currency,
      originalAmount: row.original_amount,
      originalCurrency: row.original_currency,
    })
  ) {
    return null;
  }

  return {
    originalAmount: row.original_amount,
    originalCurrency: row.original_currency,
    rate: row.conversion_rate,
  };
}

function formatConversionDetail(
  originalAmount: number,
  originalCurrency: Currency,
  rate: number | null | undefined,
): string {
  const original = formatCurrency(originalAmount, originalCurrency, "en");
  if (typeof rate !== "number" || !Number.isFinite(rate)) return original;
  return `${original} × ${rate.toFixed(2)}`;
}

function MaskedText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(className, PH_SENSITIVE_PROPS.className)}
      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
    >
      {children}
    </span>
  );
}

function DrawerField({
  label,
  children,
  maskLabel = false,
}: {
  label: string;
  children: ReactNode;
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

export function RecurringCardList({
  recurring,
  loading = false,
  error = null,
  sortControl,
  onEdit,
  onDelete,
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
}: RecurringCardListProps) {
  const { t, i18n } = useTranslation(["data-tables", "transactions"]);
  const formatDisplayDate = useDisplayDate();
  const trackChomeshSeparately = useDonationStore(
    (state) => state.settings.trackChomeshSeparately,
  );
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency,
  );
  const { t: tCurrency } = useTranslation("currency-features");
  const [selected, setSelected] = useState<RecurringTransaction | null>(null);
  useRestoreOverlayOnUnmount(selected != null);
  const longPressTriggeredRef = useRef(false);
  const inSelectionMode = selectedIds.size > 0;
  const {
    openId: swipeOpenId,
    open: handleSwipeOpen,
    close: handleSwipeClose,
  } = useSwipeOpenRow(inSelectionMode);
  useMobileSelectionBodyFlag(inSelectionMode);

  const grouped = useMemo(
    () =>
      groupWithSeparators(
        groupRecurringByStatus(recurring),
        (row) => row.status,
        true,
      ),
    [recurring],
  );

  let firstSeparatorKey: string | undefined;
  for (const item of grouped) {
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

  const handleActivate = useCallback(
    (row: RecurringTransaction) => {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }
      if (inSelectionMode && onToggleSelected) {
        if (!selectionDisabled) onToggleSelected(row.id);
        return;
      }
      if (bulkPending) return;
      setSelected(row);
    },
    [bulkPending, inSelectionMode, onToggleSelected, selectionDisabled],
  );

  const handleCloseDrawer = useCallback(() => {
    setSelected(null);
  }, []);

  const showBulkBar = Boolean(
    inSelectionMode &&
      onClearSelection &&
      onSelectionEdit &&
      onSelectionDelete &&
      selectedCountLabel &&
      editLabel &&
      deleteLabel &&
      clearLabel &&
      bulkToolbarAriaLabel,
  );

  if (loading) {
    return <CardListStates status="loading" header={sortRow} />;
  }

  if (recurring.length === 0) {
    if (error) {
      return (
        <div>
          {sortRow}
          <p className="py-12 text-center text-destructive">
            {t("messages.loadingError", { error })}
          </p>
        </div>
      );
    }
    return (
      <CardListStates status="empty" text={t("recurringTable.noData")} header={sortRow} />
    );
  }

  const categoryFamily = selected ? categoryFamilyOf(selected.type) : null;
  const categoryLabel = selected
    ? nonEmptyText(
        formatCategory(categoryFamily, selected.category, i18n.language, ""),
      )
    : null;
  const recipient = selected ? nonEmptyText(selected.recipient) : null;
  const paymentMethod = selected ? nonEmptyText(selected.payment_method) : null;
  const selectedConversion = selected ? storedConversion(selected) : null;
  const showChomesh = Boolean(
    selected && trackChomeshSeparately && selected.is_chomesh,
  );

  return (
    <>
      {showBulkBar &&
      onClearSelection &&
      onSelectionEdit &&
      onSelectionDelete &&
      selectedCountLabel &&
      editLabel &&
      deleteLabel &&
      clearLabel &&
      bulkToolbarAriaLabel ? (
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
      ) : null}
      <div
        className={cn(
          "space-y-2",
          inSelectionMode && MOBILE_SELECTION_CLEARANCE_CLASS,
        )}
      >
        {error ? (
          <p className="text-center text-destructive">
            {t("messages.loadingError", { error })}
          </p>
        ) : null}
        {chipOnFirstSeparator ? null : sortRow}
        {grouped.map((item) => {
          if (item.type === "separator") {
            const placeChip = chipOnFirstSeparator && item.key === firstSeparatorKey;
            return (
              <StickyGroupHeader
                key={`status-${item.key}`}
                label={t(`recurring.statuses.${item.key}`, item.key)}
                placeChip={placeChip}
                chip={sortControl}
              />
            );
          }

          const row = item.item;
          const displayDue = formatDisplayDate(row.next_due_date, "numeric");
          const nextDueLabel = t("cards.nextShort", {
            date: displayDue.primary,
          });
          const secondaryDue = displayDue.secondary ?? null;
          const isSelected = selectedIds.has(row.id);
          const conversion = storedConversion(row);
          const showLiveRateIcon =
            !conversion && row.currency !== defaultCurrency;
          const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            handleActivate(row);
          };

          return (
            <SwipeableCardRow
              key={row.id}
              id={row.id}
              surfaceClassName={CARD_SURFACE_CLASS}
              isSelected={isSelected}
              inSelectionMode={inSelectionMode}
              selectionDisabled={selectionDisabled}
              onToggleSelected={onToggleSelected}
              onActivate={() => handleActivate(row)}
              onKeyDown={handleKeyDown}
              longPressTriggeredRef={longPressTriggeredRef}
              isRTL={i18n.dir() === "rtl"}
              openId={swipeOpenId}
              onSwipeOpen={handleSwipeOpen}
              onSwipeClose={handleSwipeClose}
              actions={[
                {
                  icon: <Edit3 className="h-5 w-5" />,
                  label: t("actions.edit"),
                  variant: "default",
                  disabled: row.status === "completed",
                  onClick: () => onEdit(row),
                },
                {
                  icon: <Trash2 className="h-5 w-5" />,
                  label: t("actions.delete"),
                  variant: "destructive",
                  onClick: () => onDelete(row),
                },
              ]}
            >
              <TypeIconChip type={row.type} />
              <div className="min-w-0 flex-1 overflow-hidden">
                <MaskedText className="block truncate text-[12px] font-medium leading-none">
                  {row.description || "-"}
                </MaskedText>
                <span className="sr-only">
                  {t(`recurring.statuses.${row.status}`, row.status)}
                </span>
                <div className="mt-0.5 flex min-w-0 flex-nowrap items-center gap-x-1 overflow-hidden text-[10px] leading-none text-muted-foreground">
                  <MaskedText className="shrink-0 whitespace-nowrap">
                    {t(`recurring.frequencies.${row.frequency}`, row.frequency)}
                  </MaskedText>
                  <span className="shrink-0" aria-hidden="true">
                    ·
                  </span>
                  <MaskedText className="shrink-0 whitespace-nowrap">
                    {nextDueLabel}
                  </MaskedText>
                  {secondaryDue ? (
                    <MaskedText className="min-w-0 flex-1 truncate">
                      {secondaryDue}
                    </MaskedText>
                  ) : null}
                  {row.calendar_type === "hebrew" ? (
                    <Badge
                      variant="secondary"
                      className={cn(
                        "h-3 min-w-0 max-w-[5rem] shrink overflow-hidden px-1 py-0 text-[9px] font-normal leading-none",
                        PH_SENSITIVE_PROPS.className,
                      )}
                      data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                    >
                      <span className="block min-w-0 truncate">
                        {t("recurring.calendars.hebrew")}
                      </span>
                    </Badge>
                  ) : null}
                  <span className="shrink-0">
                    <RecurringProgressBadge
                      status={row.status}
                      type={row.type}
                      executionCount={row.execution_count}
                      totalOccurrences={row.total_occurrences}
                      frequency={row.frequency}
                      dayOfMonth={row.day_of_month}
                      className="h-3 shrink-0 whitespace-nowrap px-1 py-0 text-[9px] leading-none"
                    />
                  </span>
                </div>
              </div>
              <AmountPanel
                type={row.type}
                conversion={
                  conversion ? (
                    <div className="inline-flex items-center gap-0.5 leading-none">
                      <Coins
                        className="h-2 w-2 shrink-0 opacity-70"
                        aria-hidden="true"
                      />
                      <MaskedText className="text-[9px] font-normal leading-none text-muted-foreground">
                        {formatCurrency(
                          conversion.originalAmount,
                          conversion.originalCurrency,
                          i18n.language,
                        )}
                      </MaskedText>
                    </div>
                  ) : showLiveRateIcon ? (
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <RefreshCw
                            className="h-2 w-2 text-muted-foreground cursor-help"
                            aria-label={tCurrency("row.tooltip.conversionDetails")}
                          />
                        </TooltipTrigger>
                        <TooltipContent
                          className={cn(
                            "text-xs bg-popover text-popover-foreground border shadow-md p-2",
                            PH_SENSITIVE_PROPS.className,
                          )}
                          data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
                        >
                          {tCurrency("row.tooltip.estimated")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : undefined
                }
              >
                <MaskedText>
                  <CurrencyConversionInfo
                    amount={row.amount}
                    currency={row.currency}
                    originalAmount={row.original_amount}
                    originalCurrency={row.original_currency}
                    conversionRate={row.conversion_rate}
                    conversionDate={row.conversion_date}
                    rateSource={row.rate_source}
                    mode="live"
                    showConversionIcon={false}
                  />
                </MaskedText>
              </AmountPanel>
            </SwipeableCardRow>
          );
        })}
      </div>

      <Drawer open={selected != null} onOpenChange={(open) => !open && handleCloseDrawer()}>
        <DrawerContent dir={i18n.dir()}>
          <DrawerHeader className="flex flex-col gap-0 p-4 pb-3 text-start sm:text-start">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <DrawerTitle
                className={cn(
                  "min-w-0 flex-1 break-words text-start font-semibold leading-[1.2] line-clamp-2",
                  PH_SENSITIVE_PROPS.className,
                )}
                data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
              >
                {selected?.description || t("messages.defaultRecurringName")}
              </DrawerTitle>
              {selected ? (
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 whitespace-nowrap border",
                    typeBadgeColors[selected.type],
                  )}
                >
                  {t(`types.${selected.type}`, selected.type)}
                </Badge>
              ) : null}
            </div>
            {selected ? (
              <div className="mt-3 text-center">
                <MaskedText className="text-[32px] font-bold leading-[1.15]">
                  <CurrencyConversionInfo
                    amount={selected.amount}
                    currency={selected.currency}
                    originalAmount={selected.original_amount}
                    originalCurrency={selected.original_currency}
                    conversionRate={selected.conversion_rate}
                    conversionDate={selected.conversion_date}
                    rateSource={selected.rate_source}
                    mode="live"
                    showConversionIcon={false}
                  />
                </MaskedText>
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

          {selected ? (
            <div className="px-4 [&>*:last-child]:border-b">
              <DrawerField label={t("recurringColumns.frequency")}>
                <span className="min-w-0 text-end">
                  <MaskedText className={drawerValueClass}>
                    {t(`recurring.frequencies.${selected.frequency}`, selected.frequency)}
                  </MaskedText>
                  <MaskedText className="mt-0.5 block text-end text-[13px] font-normal text-muted-foreground">
                    {t(`recurring.calendars.${selected.calendar_type ?? "gregorian"}`)}
                  </MaskedText>
                </span>
              </DrawerField>
              <DrawerDateField
                label={t("recurringColumns.nextDueDate")}
                primary={formatDisplayDate(selected.next_due_date, "numeric").primary}
                secondary={formatDisplayDate(selected.next_due_date, "numeric").secondary}
              />
              <DrawerDateField
                label={t("recurringColumns.startDate")}
                primary={formatDisplayDate(selected.start_date, "numeric").primary}
                secondary={formatDisplayDate(selected.start_date, "numeric").secondary}
              />
              {selected.status !== "active" ? (
                <DrawerField label={t("recurringColumns.status")}>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 border",
                      recurringStatusBadgeColors[selected.status],
                    )}
                  >
                    {t(`recurring.statuses.${selected.status}`, selected.status)}
                  </Badge>
                </DrawerField>
              ) : null}
              {paymentMethod ? (
                <DrawerField label={t("columns.paymentMethod")}>
                  <MaskedText className={drawerValueClass}>
                    {formatPaymentMethod(selected.payment_method, i18n.language, "-")}
                  </MaskedText>
                </DrawerField>
              ) : null}
              {categoryLabel ? (
                <DrawerField label={t("columns.category")}>
                  <MaskedText className={drawerValueClass}>{categoryLabel}</MaskedText>
                </DrawerField>
              ) : null}
              {recipient ? (
                <DrawerField label={t("columns.recipient")}>
                  <MaskedText className={drawerValueClass}>{recipient}</MaskedText>
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
                    {formatBoolean(selected.is_chomesh)}
                  </div>
                </DrawerField>
              ) : null}
              <DrawerField label={t("recurringColumns.progress")}>
                <RecurringProgressBadge
                  status={selected.status}
                  type={selected.type}
                  executionCount={selected.execution_count}
                  totalOccurrences={selected.total_occurrences}
                  frequency={selected.frequency}
                  dayOfMonth={selected.day_of_month}
                />
              </DrawerField>
            </div>
          ) : null}

          <DrawerFooter className="flex-row gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Button
              variant="default"
              onClick={() => {
                if (!selected || selected.status === "completed") return;
                const row = selected;
                handleCloseDrawer();
                onEdit(row);
              }}
              disabled={selected?.status === "completed"}
              className="h-11 flex-1"
            >
              <Edit3 className="me-2 h-4 w-4" />
              {t("actions.edit")}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!selected) return;
                const row = selected;
                handleCloseDrawer();
                onDelete(row);
              }}
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

function DrawerDateField({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary: string;
  secondary?: string;
}) {
  return (
    <DrawerField label={label}>
      {secondary ? (
        <span className="min-w-0 text-end text-[15px] font-medium leading-[1.3]">
          <MaskedText>{primary}</MaskedText>
          <MaskedText className="mt-0.5 block text-[13px] font-normal text-muted-foreground">
            {secondary}
          </MaskedText>
        </span>
      ) : (
        <MaskedText className={drawerValueClass}>{primary}</MaskedText>
      )}
    </DrawerField>
  );
}
