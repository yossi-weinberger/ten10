// import { invoke } from "@tauri-apps/api/core"; // STATIC IMPORT REMOVED
import { supabase } from "@/lib/supabaseClient";
// import { getCurrentPlatform } from "./platformService"; // No longer needed
import { getPlatform } from "../platformManager";
import { logger } from "@/lib/logger";

export interface MonthlyDataPoint {
  month_label: string; // "YYYY-MM"
  income: number;
  donations: number;
  expenses: number;
}

export type ServerMonthlyDataResponse = MonthlyDataPoint[];

const SUPABASE_RPC_FUNCTION_NAME = "get_monthly_financial_summary";
const TAURI_COMMAND_NAME = "get_desktop_monthly_financial_summary";

export async function fetchServerMonthlyChartData(
  userId: string | null,
  endDate: Date, // JavaScript Date object
  numMonths: number
): Promise<ServerMonthlyDataResponse | null> {
  // Validate endDate
  if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
    logger.error(
      "ChartService: Invalid endDate received. Expected a valid Date object. Received:",
      endDate
    );
    return null;
  }

  const endDateStr = endDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  const platform = getPlatform();

  logger.log(
    `ChartService: Fetching monthly chart data for ${numMonths} months ending ${endDateStr}, platform: ${platform}`
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
        p_end_date: endDateStr,
        p_num_months: numMonths,
      });

      if (error) {
        logger.error(
          `ChartService: Error calling ${SUPABASE_RPC_FUNCTION_NAME} RPC:`,
          error
        );
        throw error;
      }
      logger.log("ChartService: Successfully fetched chart data (Web):", data);
      return data as ServerMonthlyDataResponse;
    } else if (platform === "desktop") {
      const { invoke } = await import("@tauri-apps/api/core");
      const data = await invoke<ServerMonthlyDataResponse>(TAURI_COMMAND_NAME, {
        endDateStr: endDateStr,
        numMonths: numMonths,
      });
      logger.log(
        "ChartService: Successfully fetched chart data (Desktop):",
        data
      );
      return data;
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
