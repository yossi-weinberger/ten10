import { supabase } from "@/lib/supabaseClient";
import { getPlatform } from "../platformManager";
import { logger } from "@/lib/logger";
import { RecurringTransaction } from "@/types/transaction";

// ─── Active Recurring Transactions ───────────────────────────────────────────

async function fetchActiveRecurringWeb(): Promise<RecurringTransaction[]> {
  const { data, error } = await supabase
    .from("recurring_transactions")
    .select("*")
    .eq("status", "active");
  if (error) {
    logger.error("InsightsService: fetchActiveRecurring web error:", error);
    throw error;
  }
  return (data ?? []) as RecurringTransaction[];
}

async function fetchActiveRecurringDesktop(): Promise<RecurringTransaction[]> {
  // Inline import is intentional: Tauri APIs are unavailable in web context.
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RecurringTransaction[]>("get_recurring_transactions_handler", {
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
  });
}

export async function fetchActiveRecurring(): Promise<RecurringTransaction[]> {
  const platform = getPlatform();
  try {
    if (platform === "web") return await fetchActiveRecurringWeb();
    if (platform === "desktop") return await fetchActiveRecurringDesktop();
  } catch (err) {
    logger.error("InsightsService: fetchActiveRecurring failed:", err);
    throw err;
  }
  return [];
}

// ─── Combined breakdowns bundle ───────────────────────────────────────────────
// Replaces three separate RPCs (payment_methods + recurring_vs_onetime + recipients)
// with one round-trip. The CTE in the RPC scans transactions once.

export interface AnalyticsBreakdownsBundle {
  payment_methods: PaymentMethodBreakdownResponse;
  recurring_vs_onetime: RecurringVsOnetimeResponse;
  recipients: DonationRecipientsResponse;
}

async function fetchAnalyticsBreakdownsWeb(
  startDate: string,
  endDate: string
): Promise<AnalyticsBreakdownsBundle> {
  const { data, error } = await supabase.rpc("get_analytics_breakdowns", {
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) {
    logger.error("InsightsService: analytics breakdowns RPC error:", error);
    throw error;
  }
  return {
    payment_methods:      ((data as { payment_methods?: unknown }).payment_methods      as PaymentMethodBreakdownResponse)  ?? [],
    recurring_vs_onetime: ((data as { recurring_vs_onetime?: unknown }).recurring_vs_onetime as RecurringVsOnetimeResponse) ?? [],
    recipients:           ((data as { recipients?: unknown }).recipients           as DonationRecipientsResponse)    ?? [],
  };
}

async function fetchAnalyticsBreakdownsDesktop(
  startDate: string,
  endDate: string
): Promise<AnalyticsBreakdownsBundle> {
  // Inline import intentional: Tauri APIs are unavailable in web context.
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AnalyticsBreakdownsBundle>("get_desktop_analytics_breakdowns", {
    startDate,
    endDate,
  });
}

export async function fetchAnalyticsBreakdowns(
  startDate: string,
  endDate: string
): Promise<AnalyticsBreakdownsBundle> {
  const platform = getPlatform();
  try {
    if (platform === "web")     return await fetchAnalyticsBreakdownsWeb(startDate, endDate);
    if (platform === "desktop") return await fetchAnalyticsBreakdownsDesktop(startDate, endDate);
  } catch (err) {
    logger.error("InsightsService: fetchAnalyticsBreakdowns failed:", err);
    throw err;
  }
  return { payment_methods: [], recurring_vs_onetime: [], recipients: [] };
}

// ─── Heatmap ──────────────────────────────────────────────────────────────────

export interface DailyHeatmapItem {
  tx_date: string;
  tx_count: number;
  total_amount: number;
}
export type DailyHeatmapResponse = DailyHeatmapItem[];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CategoryBreakdownItem {
  category: string;
  total_amount: number;
}
export type CategoryBreakdownResponse = CategoryBreakdownItem[];

export interface PaymentMethodBreakdownItem {
  payment_method: string;
  total_amount: number;
}
export type PaymentMethodBreakdownResponse = PaymentMethodBreakdownItem[];

export interface RecurringVsOnetimeItem {
  is_recurring: boolean;
  total_amount: number;
  tx_count: number;
}
export type RecurringVsOnetimeResponse = RecurringVsOnetimeItem[];

export interface DonationRecipientItem {
  recipient: string;
  total_amount: number;
  last_description?: string | null;
}
export type DonationRecipientsResponse = DonationRecipientItem[];

export type CategoryType = "expense" | "income" | "donation";

// ─── 1. Category Breakdown ───────────────────────────────────────────────────

async function fetchCategoryBreakdownWeb(
  startDate: string,
  endDate: string,
  type: CategoryType
): Promise<CategoryBreakdownResponse> {
  const { data, error } = await supabase.rpc("get_category_breakdown", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_type: type,
  });
  if (error) {
    logger.error("InsightsService: category breakdown error:", error);
    throw error;
  }
  return (data ?? []) as CategoryBreakdownResponse;
}

async function fetchCategoryBreakdownDesktop(
  startDate: string,
  endDate: string,
  type: CategoryType
): Promise<CategoryBreakdownResponse> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<CategoryBreakdownResponse>(
    "get_desktop_category_breakdown",
    { startDate, endDate, transactionType: type }
  );
}

export async function fetchCategoryBreakdown(
  startDate: string,
  endDate: string,
  type: CategoryType
): Promise<CategoryBreakdownResponse> {
  const platform = getPlatform();
  try {
    if (platform === "web")     return await fetchCategoryBreakdownWeb(startDate, endDate, type);
    if (platform === "desktop") return await fetchCategoryBreakdownDesktop(startDate, endDate, type);
  } catch (err) {
    logger.error("InsightsService: fetchCategoryBreakdown failed:", err);
    throw err;
  }
  return [];
}

// ─── 3. Daily Transaction Heatmap ────────────────────────────────────────────

export type HeatmapTypeGroup = "all" | "income" | "expense" | "donation";

async function fetchDailyHeatmapWeb(
  startDate: string,
  endDate: string,
  typeGroup: HeatmapTypeGroup
): Promise<DailyHeatmapResponse> {
  const { data, error } = await supabase.rpc("get_daily_transaction_heatmap", {
    p_start_date: startDate,
    p_end_date: endDate,
    p_type_group: typeGroup,
  });
  if (error) {
    logger.error("InsightsService: heatmap error:", error);
    throw error;
  }
  return (data ?? []) as DailyHeatmapResponse;
}

async function fetchDailyHeatmapDesktop(
  startDate: string,
  endDate: string,
  typeGroup: HeatmapTypeGroup
): Promise<DailyHeatmapResponse> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DailyHeatmapResponse>("get_desktop_daily_heatmap", {
    startDate,
    endDate,
    typeGroup: typeGroup === "all" ? null : typeGroup,
  });
}

export async function fetchDailyHeatmap(
  startDate: string,
  endDate: string,
  typeGroup: HeatmapTypeGroup = "all"
): Promise<DailyHeatmapResponse> {
  const platform = getPlatform();
  try {
    if (platform === "web")     return await fetchDailyHeatmapWeb(startDate, endDate, typeGroup);
    if (platform === "desktop") return await fetchDailyHeatmapDesktop(startDate, endDate, typeGroup);
  } catch (err) {
    logger.error("InsightsService: fetchDailyHeatmap failed:", err);
    throw err;
  }
  return [];
}
