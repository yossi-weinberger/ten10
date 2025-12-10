import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface AdminUserStats {
  total: number;
  active_30d: number;
  new_30d: number;
  new_7d: number;
}

export interface AdminFinanceStats {
  total_income: number;
  total_expenses: number;
  total_donations: number;
  total_recognized_expenses: number;
  total_exempt_income: number;
  total_non_tithe_donation: number;
  by_currency: Record<
    string,
    {
      income: number;
      expenses: number;
      donations: number;
      total_managed: number;
    }
  >;
}

export interface AdminDownloadStats {
  total: number;
  last_30d: number;
  by_platform: Record<string, number>;
}

export interface AdminEngagementStats {
  avg_transactions_per_user: number;
  total_transactions: number;
  users_with_transactions: number;
}

export interface AdminSystemStats {
  total_recurring_transactions: number;
  active_recurring_transactions: number;
}

export interface AdminDashboardStats {
  users: AdminUserStats;
  finance: AdminFinanceStats;
  downloads: AdminDownloadStats;
  engagement: AdminEngagementStats;
  system: AdminSystemStats;
}

export interface MonthlyTrend {
  month: string;
  new_users: number;
  total_income: number;
  total_expenses: number;
  total_donations: number;
  transaction_count: number;
  active_users: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Fetch comprehensive admin dashboard statistics
 * Requires admin privileges (email whitelist)
 */
export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats | null> {
  try {
    logger.log("AdminService: Fetching admin dashboard stats");

    const { data, error } = await supabase.rpc("get_admin_dashboard_stats");

    if (error) {
      logger.error("AdminService: Error fetching stats:", error);
      throw error;
    }

    logger.log("AdminService: Stats fetched successfully", data);
    return data as AdminDashboardStats;
  } catch (error) {
    logger.error("AdminService: Failed to fetch admin stats:", error);
    return null;
  }
}

/**
 * Fetch monthly trends for admin dashboard
 * Requires admin privileges (email whitelist)
 * @param startDate - Start date (YYYY-MM-DD format)
 * @param endDate - End date (YYYY-MM-DD format)
 */
export async function fetchAdminMonthlyTrends(
  startDate?: string,
  endDate?: string
): Promise<MonthlyTrend[] | null> {
  try {
    logger.log(
      `AdminService: Fetching monthly trends from ${
        startDate || "default"
      } to ${endDate || "default"}`
    );

    const { data, error } = await supabase.rpc("get_admin_monthly_trends", {
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) {
      logger.error("AdminService: Error fetching trends:", error);
      throw error;
    }

    logger.log("AdminService: Trends fetched successfully");
    return data as MonthlyTrend[];
  } catch (error) {
    logger.error("AdminService: Failed to fetch monthly trends:", error);
    return null;
  }
}

/**
 * Check if the current user is an admin
 * Returns true if user has admin privileges, false otherwise
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("get_admin_dashboard_stats");
    return !error;
  } catch {
    return false;
  }
}
