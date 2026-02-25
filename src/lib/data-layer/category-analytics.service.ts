import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

export interface CategoryBreakdown {
  category: string;
  total_amount: number;
}

export interface PaymentMethodBreakdown {
  payment_method: string;
  total_amount: number;
}

export interface DailyExpense {
  expense_date: string;
  total_amount: number;
}

async function fetchExpensesByCategoryWeb(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CategoryBreakdown[]> {
  const { data, error } = await supabase.rpc("get_expenses_by_category", {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) {
    logger.error("CategoryAnalytics: Error fetching expenses by category:", error);
    throw error;
  }
  return (data as CategoryBreakdown[]) ?? [];
}

async function fetchIncomeByCategoryWeb(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CategoryBreakdown[]> {
  const { data, error } = await supabase.rpc("get_income_by_category", {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) {
    logger.error("CategoryAnalytics: Error fetching income by category:", error);
    throw error;
  }
  return (data as CategoryBreakdown[]) ?? [];
}

async function fetchExpensesByPaymentMethodWeb(
  userId: string,
  startDate: string,
  endDate: string
): Promise<PaymentMethodBreakdown[]> {
  const { data, error } = await supabase.rpc("get_expenses_by_payment_method", {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) {
    logger.error("CategoryAnalytics: Error fetching expenses by payment method:", error);
    throw error;
  }
  return (data as PaymentMethodBreakdown[]) ?? [];
}

async function fetchDailyExpensesWeb(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyExpense[]> {
  const { data, error } = await supabase.rpc("get_daily_expenses", {
    p_user_id: userId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) {
    logger.error("CategoryAnalytics: Error fetching daily expenses:", error);
    throw error;
  }
  return (data as DailyExpense[]) ?? [];
}

// Desktop stubs — require matching Tauri commands in Rust
async function fetchExpensesByCategoryDesktop(
  startDate: string,
  endDate: string
): Promise<CategoryBreakdown[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<CategoryBreakdown[]>(
      "get_desktop_expenses_by_category",
      { startDate, endDate }
    );
  } catch (err) {
    logger.error("CategoryAnalytics: Desktop expenses by category error:", err);
    return [];
  }
}

async function fetchIncomeByCategoryDesktop(
  startDate: string,
  endDate: string
): Promise<CategoryBreakdown[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<CategoryBreakdown[]>(
      "get_desktop_income_by_category",
      { startDate, endDate }
    );
  } catch (err) {
    logger.error("CategoryAnalytics: Desktop income by category error:", err);
    return [];
  }
}

async function fetchExpensesByPaymentMethodDesktop(
  startDate: string,
  endDate: string
): Promise<PaymentMethodBreakdown[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<PaymentMethodBreakdown[]>(
      "get_desktop_expenses_by_payment_method",
      { startDate, endDate }
    );
  } catch (err) {
    logger.error("CategoryAnalytics: Desktop payment method error:", err);
    return [];
  }
}

async function fetchDailyExpensesDesktop(
  startDate: string,
  endDate: string
): Promise<DailyExpense[]> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<DailyExpense[]>(
      "get_desktop_daily_expenses",
      { startDate, endDate }
    );
  } catch (err) {
    logger.error("CategoryAnalytics: Desktop daily expenses error:", err);
    return [];
  }
}

// Platform-aware wrappers
export async function fetchExpensesByCategory(
  userId: string | null,
  startDate: string,
  endDate: string
): Promise<CategoryBreakdown[]> {
  const platform = getPlatform();
  if (platform === "web" && userId) {
    return fetchExpensesByCategoryWeb(userId, startDate, endDate);
  } else if (platform === "desktop") {
    return fetchExpensesByCategoryDesktop(startDate, endDate);
  }
  return [];
}

export async function fetchIncomeByCategory(
  userId: string | null,
  startDate: string,
  endDate: string
): Promise<CategoryBreakdown[]> {
  const platform = getPlatform();
  if (platform === "web" && userId) {
    return fetchIncomeByCategoryWeb(userId, startDate, endDate);
  } else if (platform === "desktop") {
    return fetchIncomeByCategoryDesktop(startDate, endDate);
  }
  return [];
}

export async function fetchExpensesByPaymentMethod(
  userId: string | null,
  startDate: string,
  endDate: string
): Promise<PaymentMethodBreakdown[]> {
  const platform = getPlatform();
  if (platform === "web" && userId) {
    return fetchExpensesByPaymentMethodWeb(userId, startDate, endDate);
  } else if (platform === "desktop") {
    return fetchExpensesByPaymentMethodDesktop(startDate, endDate);
  }
  return [];
}

export async function fetchDailyExpenses(
  userId: string | null,
  startDate: string,
  endDate: string
): Promise<DailyExpense[]> {
  const platform = getPlatform();
  if (platform === "web" && userId) {
    return fetchDailyExpensesWeb(userId, startDate, endDate);
  } else if (platform === "desktop") {
    return fetchDailyExpensesDesktop(startDate, endDate);
  }
  return [];
}
