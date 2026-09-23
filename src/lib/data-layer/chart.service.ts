import { invoke } from "@tauri-apps/api/core";
import { supabase } from "@/lib/supabaseClient";
import {
  getCalendarAdapter,
  type CalendarType,
} from "@/lib/calendar";
import { getPlatform } from "../platformManager";
import { logger } from "@/lib/logger";

export interface MonthlyDataPoint {
  period_index: number;
  period_start: string;
  period_end: string;
  period_key: string;
  cache_key: string;
  income: number;
  donations: number;
  expenses: number;
}

export type ServerMonthlyDataResponse = MonthlyDataPoint[];

interface PeriodSummaryRow {
  period_index: number;
  period_start: string;
  period_end: string;
  income: number;
  donations: number;
  expenses: number;
}

const SUPABASE_RPC_FUNCTION_NAME = "get_period_financial_summary";
const TAURI_COMMAND_NAME = "get_desktop_period_financial_summary";

function mapPeriodRows(
  rows: readonly PeriodSummaryRow[],
  calendarType: CalendarType,
): MonthlyDataPoint[] {
  const adapter = getCalendarAdapter(calendarType);

  return rows.map((row) => {
    const periodKey = adapter.monthKey(row.period_start);
    return {
      ...row,
      period_key: periodKey,
      cache_key: `${calendarType}:${periodKey}`,
    };
  });
}

export async function fetchServerMonthlyChartData(
  userId: string | null,
  boundaries: readonly string[],
  calendarType: CalendarType,
): Promise<ServerMonthlyDataResponse | null> {
  if (boundaries.length < 2) {
    logger.error(
      "ChartService: At least two period boundaries are required.",
    );
    return null;
  }

  const platform = getPlatform();

  logger.log(
    `ChartService: Fetching ${boundaries.length - 1} periods, platform: ${platform}`,
  );

  try {
    if (platform === "web") {
      if (!userId) {
        logger.warn(
          "ChartService: User ID is required for web platform but not provided."
        );
        return null;
      }
      const { data, error } = await supabase.rpc(SUPABASE_RPC_FUNCTION_NAME, {
        p_user_id: userId,
        p_boundaries: boundaries,
      });

      if (error) {
        logger.error(
          `ChartService: Error calling ${SUPABASE_RPC_FUNCTION_NAME} RPC:`,
          error
        );
        throw error;
      }
      logger.log("ChartService: Successfully fetched chart data (Web):", data);
      return mapPeriodRows((data ?? []) as PeriodSummaryRow[], calendarType);
    } else if (platform === "desktop") {
      const data = await invoke<PeriodSummaryRow[]>(TAURI_COMMAND_NAME, {
        boundaries,
      });
      logger.log(
        "ChartService: Successfully fetched chart data (Desktop):",
        data
      );
      return mapPeriodRows(data, calendarType);
    } else {
      // This case should ideally not be hit if MonthlyChart calls this function
      // only after platform is 'web' or 'desktop'.
      // The 'loading' case should be handled by the calling component.
      logger.warn(
        "ChartService: fetchServerMonthlyChartData called with platform:",
        platform
      );
      return null;
    }
  } catch (errorCaught: any) {
    logger.error("ChartService: Exception fetching chart data:", errorCaught);
    throw new Error(
      `Failed to fetch chart data. Original error: ${
        errorCaught.message || errorCaught
      }`
    );
  }
}
