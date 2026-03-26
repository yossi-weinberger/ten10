import { useEffect, useState, useCallback } from "react";
import { useDonationStore } from "@/lib/store";
import {
  fetchCategoryBreakdown,
  fetchPaymentMethodBreakdown,
  fetchRecurringVsOnetime,
  fetchDonationRecipientsBreakdown,
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
import { getPlatform } from "@/lib/platformManager";
import { supabase } from "@/lib/supabaseClient";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute the "previous period" date range of the same length as the active one.
 * Used for delta % comparison on KPI cards.
 */
export function getPreviousPeriodRange(
  startDate: string,
  endDate: string
): { startDate: string; endDate: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const lengthMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - lengthMs);
  return {
    startDate: prevStart.toISOString().split("T")[0],
    endDate: prevEnd.toISOString().split("T")[0],
  };
}

/** Fetch active recurring transactions for current platform. */
async function fetchActiveRecurring(): Promise<RecurringTransaction[]> {
  const platform = getPlatform();
  if (platform === "web") {
    const { data, error } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("status", "active");
    if (error) throw error;
    return (data ?? []) as RecurringTransaction[];
  } else if (platform === "desktop") {
    const { invoke } = await import("@tauri-apps/api/core");
    // get_recurring_transactions_handler requires args: GetRecurringTransactionsArgs
    const all = await invoke<RecurringTransaction[]>(
      "get_recurring_transactions_handler",
      {
        args: {
          sorting: { field: "next_due_date", direction: "asc" },
          filters: {
            search: null,
            statuses: ["active"],
            types: null,
            date_from: null,
            date_to: null,
            frequencies: null,
          },
        },
      }
    );
    return all; // statuses: ["active"] filter already applied server-side
  }
  return [];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseInsightsResult {
  // Category breakdown
  categoryData: CategoryBreakdownResponse;
  isLoadingCategory: boolean;
  categoryError: string | null;
  categoryType: CategoryType;
  setCategoryType: (t: CategoryType) => void;

  // Active recurring transactions (replaces forecastData)
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

  const loadActiveRecurring = useCallback(async () => {
    if (!isReady) return;
    setIsLoadingRecurring(true);
    setRecurringError(null);
    try {
      const data = await fetchActiveRecurring();
      setActiveRecurring(data);
    } catch (err) {
      logger.error("useInsights: active recurring error:", err);
      setRecurringError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingRecurring(false);
    }
  }, [isReady]);

  const loadPaymentMethods = useCallback(async () => {
    if (!isReady) return;
    setIsLoadingPaymentMethod(true);
    setPaymentMethodError(null);
    try {
      const data = await fetchPaymentMethodBreakdown(startDate, endDate);
      setPaymentMethodData(data);
    } catch (err) {
      logger.error("useInsights: payment method error:", err);
      setPaymentMethodError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingPaymentMethod(false);
    }
  }, [isReady, startDate, endDate]);

  const loadRecurringRatio = useCallback(async () => {
    if (!isReady) return;
    setIsLoadingRecurringRatio(true);
    setRecurringRatioError(null);
    try {
      const data = await fetchRecurringVsOnetime(startDate, endDate);
      setRecurringVsOnetimeData(data);
    } catch (err) {
      logger.error("useInsights: recurring ratio error:", err);
      setRecurringRatioError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingRecurringRatio(false);
    }
  }, [isReady, startDate, endDate]);

  const loadRecipients = useCallback(async () => {
    if (!isReady) return;
    setIsLoadingRecipients(true);
    setRecipientsError(null);
    try {
      const data = await fetchDonationRecipientsBreakdown(startDate, endDate);
      setRecipientsData(data);
    } catch (err) {
      logger.error("useInsights: recipients error:", err);
      setRecipientsError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingRecipients(false);
    }
  }, [isReady, startDate, endDate]);

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

  // Fetch everything that depends only on date range / platform / db timestamp
  useEffect(() => {
    if (!isReady) return;
    loadActiveRecurring();
    loadPaymentMethods();
    loadRecurringRatio();
    loadRecipients();
  }, [isReady, startDate, endDate, platform, lastDbFetchTimestamp]);

  // Category re-fetches when date range, categoryType, platform, or db changes.
  // loadCategory captures [isReady, startDate, endDate, categoryType] via useCallback,
  // so a new reference is produced whenever any of those change.
  useEffect(() => {
    if (!isReady) return;
    loadCategory();
  }, [loadCategory, platform, lastDbFetchTimestamp]);

  // Heatmap re-fetches when date range, heatmapTypeGroup, platform, or db changes.
  // loadHeatmap captures [isReady, startDate, endDate, heatmapTypeGroup] via useCallback.
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
