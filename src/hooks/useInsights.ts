import { useEffect, useState, useCallback } from "react";
import { useDonationStore } from "@/lib/store";
import {
  fetchCategoryBreakdown,
  fetchActiveRecurring,
  fetchAnalyticsBreakdowns,
  fetchDailyHeatmap,
  CategoryBreakdownResponse,
  CategoryType,
  HeatmapTypeGroup,
  PaymentMethodBreakdownResponse,
  RecurringVsOnetimeResponse,
  DonationRecipientsResponse,
  DailyHeatmapResponse,
} from "@/lib/data-layer/insights.service";
import { RecurringTransaction } from "@/types/transaction";
import { DateRangeObject } from "./useDateControls";
import { Platform } from "@/contexts/PlatformContext";
import { logger } from "@/lib/logger";

// Re-export so existing callers don't break
export { getPreviousPeriodRange } from "@/lib/utils/date-range";

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseInsightsResult {
  // Category breakdown (chart — depends on categoryType selection)
  categoryData: CategoryBreakdownResponse;
  isLoadingCategory: boolean;
  categoryError: string | null;
  categoryType: CategoryType;
  setCategoryType: (t: CategoryType) => void;

  // Top category per type — always fetched, independent of chart tab
  expenseCategoryTop: import("@/lib/data-layer/insights.service").CategoryBreakdownItem | null;
  incomeCategoryTop: import("@/lib/data-layer/insights.service").CategoryBreakdownItem | null;

  // Active recurring transactions
  activeRecurring: RecurringTransaction[];
  isLoadingRecurring: boolean;
  recurringError: string | null;

  // Payment methods
  paymentMethodData: PaymentMethodBreakdownResponse;
  isLoadingPaymentMethod: boolean;
  paymentMethodError: string | null;

  // Recurring vs one-time
  recurringVsOnetimeData: RecurringVsOnetimeResponse;
  isLoadingRecurringRatio: boolean;
  recurringRatioError: string | null;

  // Donation recipients
  recipientsData: DonationRecipientsResponse;
  isLoadingRecipients: boolean;
  recipientsError: string | null;

  // Daily heatmap
  heatmapData: DailyHeatmapResponse;
  isLoadingHeatmap: boolean;
  heatmapError: string | null;
  heatmapTypeGroup: HeatmapTypeGroup;
  setHeatmapTypeGroup: (g: HeatmapTypeGroup) => void;
}

export function useInsights(
  activeDateRangeObject: DateRangeObject,
  platform: Platform | undefined
): UseInsightsResult {
  const lastDbFetchTimestamp = useDonationStore(
    (state) => state.lastDbFetchTimestamp
  );

  const [categoryType, setCategoryType] = useState<CategoryType>("expense");

  const [expenseCategoryTop, setExpenseCategoryTop] = useState<import("@/lib/data-layer/insights.service").CategoryBreakdownItem | null>(null);
  const [incomeCategoryTop, setIncomeCategoryTop] = useState<import("@/lib/data-layer/insights.service").CategoryBreakdownItem | null>(null);

  const [categoryData, setCategoryData] = useState<CategoryBreakdownResponse>([]);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const [activeRecurring, setActiveRecurring] = useState<RecurringTransaction[]>([]);
  const [isLoadingRecurring, setIsLoadingRecurring] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);

  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodBreakdownResponse>([]);
  const [isLoadingPaymentMethod, setIsLoadingPaymentMethod] = useState(false);
  const [paymentMethodError, setPaymentMethodError] = useState<string | null>(null);

  const [recurringVsOnetimeData, setRecurringVsOnetimeData] = useState<RecurringVsOnetimeResponse>([]);
  const [isLoadingRecurringRatio, setIsLoadingRecurringRatio] = useState(false);
  const [recurringRatioError, setRecurringRatioError] = useState<string | null>(null);

  const [recipientsData, setRecipientsData] = useState<DonationRecipientsResponse>([]);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [recipientsError, setRecipientsError] = useState<string | null>(null);

  const [heatmapData, setHeatmapData] = useState<DailyHeatmapResponse>([]);
  const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(false);
  const [heatmapError, setHeatmapError] = useState<string | null>(null);
  const [heatmapTypeGroup, setHeatmapTypeGroup] = useState<HeatmapTypeGroup>("all");

  const { startDate, endDate } = activeDateRangeObject;

  const isReady =
    platform !== undefined &&
    platform !== "loading" &&
    !!startDate &&
    !!endDate;

  // ─── Category (own effect — also depends on categoryType) ─────────────────

  const loadCategory = useCallback(async () => {
    if (!isReady) return;
    setIsLoadingCategory(true);
    setCategoryError(null);
    try {
      const data = await fetchCategoryBreakdown(startDate, endDate, categoryType);
      setCategoryData(data);
    } catch (err) {
      logger.error("useInsights: category breakdown error:", err);
      setCategoryError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingCategory(false);
    }
  }, [isReady, startDate, endDate, categoryType]);

  useEffect(() => {
    if (!isReady) return;
    loadCategory();
  }, [loadCategory, platform, lastDbFetchTimestamp]);

  // ─── Active recurring — date-range INDEPENDENT ────────────────────────────
  // Does NOT depend on startDate/endDate; re-fetches only when platform or
  // the DB itself changes (e.g. after adding a transaction or importing).
  useEffect(() => {
    if (!isReady) return;
    setIsLoadingRecurring(true);
    setRecurringError(null);
    fetchActiveRecurring()
      .then((data) => setActiveRecurring(data))
      .catch((err) => {
        logger.error("useInsights: active recurring error:", err);
        setRecurringError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setIsLoadingRecurring(false));
  }, [isReady, platform, lastDbFetchTimestamp]);

  // ─── Date-range dependent insights (single combined call) ────────────────
  // One HTTP request / IPC call instead of three.
  // The CTE in the RPC/desktop-command scans transactions once.
  useEffect(() => {
    if (!isReady) return;
    setIsLoadingPaymentMethod(true);
    setIsLoadingRecurringRatio(true);
    setIsLoadingRecipients(true);
    setPaymentMethodError(null);
    setRecurringRatioError(null);
    setRecipientsError(null);

    Promise.allSettled([
      fetchAnalyticsBreakdowns(startDate, endDate),
      fetchCategoryBreakdown(startDate, endDate, "expense"),
      fetchCategoryBreakdown(startDate, endDate, "income"),
    ]).then(([breakdownsResult, expCatResult, incCatResult]) => {
      if (breakdownsResult.status === "fulfilled") {
        setPaymentMethodData(breakdownsResult.value.payment_methods);
        setRecurringVsOnetimeData(breakdownsResult.value.recurring_vs_onetime);
        setRecipientsData(breakdownsResult.value.recipients);
      } else {
        logger.error("useInsights: analytics breakdowns error:", breakdownsResult.reason);
        const msg = breakdownsResult.reason instanceof Error ? breakdownsResult.reason.message : String(breakdownsResult.reason);
        setPaymentMethodError(msg);
        setRecurringRatioError(msg);
        setRecipientsError(msg);
      }
      setIsLoadingPaymentMethod(false);
      setIsLoadingRecurringRatio(false);
      setIsLoadingRecipients(false);

      // Top category per type — independent of chart selection
      if (expCatResult.status === "fulfilled") setExpenseCategoryTop(expCatResult.value[0] ?? null);
      if (incCatResult.status === "fulfilled") setIncomeCategoryTop(incCatResult.value[0] ?? null);
    });
  }, [isReady, startDate, endDate, platform, lastDbFetchTimestamp]);

  // ─── Heatmap (own effect — also depends on heatmapTypeGroup) ──────────────

  const loadHeatmap = useCallback(async () => {
    if (!isReady) return;
    setIsLoadingHeatmap(true);
    setHeatmapError(null);
    try {
      // Always fetch full history so the heatmap shows meaningful density
      // regardless of the active date filter.
      const todayStr = new Date().toISOString().split("T")[0];
      const data = await fetchDailyHeatmap("1970-01-01", todayStr, heatmapTypeGroup);
      setHeatmapData(data);
    } catch (err) {
      logger.error("useInsights: heatmap error:", err);
      setHeatmapError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingHeatmap(false);
    }
  }, [isReady, heatmapTypeGroup]);

  useEffect(() => {
    if (!isReady) return;
    loadHeatmap();
  }, [loadHeatmap, platform, lastDbFetchTimestamp]);

  return {
    categoryData,
    isLoadingCategory,
    categoryError,
    categoryType,
    setCategoryType,
    expenseCategoryTop,
    incomeCategoryTop,
    activeRecurring,
    isLoadingRecurring,
    recurringError,
    paymentMethodData,
    isLoadingPaymentMethod,
    paymentMethodError,
    recurringVsOnetimeData,
    isLoadingRecurringRatio,
    recurringRatioError,
    recipientsData,
    isLoadingRecipients,
    recipientsError,
    heatmapData,
    isLoadingHeatmap,
    heatmapError,
    heatmapTypeGroup,
    setHeatmapTypeGroup,
  };
}
