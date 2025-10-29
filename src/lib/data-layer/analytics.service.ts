import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

// Define a type for the data structure returned by server-side calculations
export interface ServerIncomeData {
  total_income: number;
  chomesh_amount: number;
}

// Define a type for the data structure returned by server-side calculations for Donations
export interface ServerDonationData {
  total_donations_amount: number;
  non_tithe_donation_amount: number;
}

// --- Server-Side Calculation Functions ---

// Web: Fetch total income and chomesh for a user from Supabase
async function fetchTotalIncomeForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerIncomeData | null> {
  logger.log(
    `AnalyticsService (Web): Fetching total income for user ${userId} from ${startDate} to ${endDate}`
  );
  try {
    const { data, error } = await supabase.rpc(
      "get_total_income_and_chomesh_for_user",
      {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
      }
    );

    if (error) {
      logger.error("Error fetching total income from Supabase RPC:", error);
      throw error;
    }
    if (
      data &&
      typeof data.total_income === "number" &&
      typeof data.chomesh_amount === "number"
    ) {
      return data as ServerIncomeData;
    } else if (
      data &&
      data.length > 0 &&
      typeof data[0].total_income === "number" &&
      typeof data[0].chomesh_amount === "number"
    ) {
      return data[0] as ServerIncomeData;
    } else {
      logger.warn(
        "AnalyticsService (Web): Received unexpected data structure from Supabase RPC or null data:",
        data
      );
      return { total_income: 0, chomesh_amount: 0 };
    }
  } catch (error) {
    logger.error("Error in fetchTotalIncomeForUserWeb:", error);
    return null;
  }
}

// Web: Fetch total expenses for a user from Supabase
async function fetchTotalExpensesForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<number | null> {
  logger.log(
    `AnalyticsService (Web): Fetching total expenses for user ${userId} from ${startDate} to ${endDate}`
  );
  try {
    const { data, error } = await supabase.rpc("get_total_expenses_for_user", {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      logger.error("Error fetching total expenses from Supabase RPC:", error);
      throw error;
    }
    if (typeof data === "number") {
      return data;
    } else {
      logger.warn(
        "AnalyticsService (Web): Received unexpected data structure from Supabase RPC for expenses or null data:",
        data
      );
      return 0;
    }
  } catch (error) {
    logger.error("Error in fetchTotalExpensesForUserWeb:", error);
    return null;
  }
}

// Desktop: Fetch total income and chomesh in a date range from SQLite
async function fetchTotalIncomeForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerIncomeData> {
  logger.log(
    `AnalyticsService (Desktop): Fetching total income from ${startDate} to ${endDate}`
  );
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<ServerIncomeData>(
      "get_desktop_total_income_in_range",
      {
        startDate,
        endDate,
      }
    );
    return result;
  } catch (error) {
    logger.error("Error invoking get_desktop_total_income_in_range:", error);
    return { total_income: 0, chomesh_amount: 0 };
  }
}

// Desktop: Fetch total expenses in a date range from SQLite
async function fetchTotalExpensesForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<number> {
  logger.log(
    `AnalyticsService (Desktop): Fetching total expenses from ${startDate} to ${endDate}`
  );
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<number>("get_desktop_total_expenses_in_range", {
      startDate,
      endDate,
    });
    return result;
  } catch (error) {
    logger.error("Error invoking get_desktop_total_expenses_in_range:", error);
    return 0;
  }
}

// Wrapper function to fetch total income based on platform
export async function fetchTotalIncomeInRange(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<ServerIncomeData | null> {
  const currentPlatform = getPlatform();
  if (currentPlatform === "web") {
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        logger.error(
          "AnalyticsService: No authenticated user found for web operation."
        );
        return null;
      }
      userId = user.id;
    }
    return fetchTotalIncomeForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalIncomeForUserDesktop(startDate, endDate);
  } else {
    logger.warn(
      "AnalyticsService (fetchTotalIncomeInRange): Platform not determined."
    );
    return null;
  }
}

// Wrapper function to fetch total expenses based on platform
export async function fetchTotalExpensesInRange(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<number | null> {
  const currentPlatform = getPlatform();
  if (currentPlatform === "web") {
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        logger.error(
          "AnalyticsService: No authenticated user found for web operation."
        );
        return null;
      }
      userId = user.id;
    }
    return fetchTotalExpensesForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalExpensesForUserDesktop(startDate, endDate);
  } else {
    logger.warn(
      "AnalyticsService (fetchTotalExpensesInRange): Platform not determined."
    );
    return null;
  }
}

// --- DONATIONS FUNCTIONS ---
async function fetchTotalDonationsForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerDonationData | null> {
  logger.log(
    `AnalyticsService (Web): Fetching total donations for user ${userId} from ${startDate} to ${endDate}`
  );
  try {
    const { data, error } = await supabase.rpc("get_total_donations_for_user", {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      logger.error("Error fetching total donations from Supabase RPC:", error);
      throw error;
    }
    if (data && Array.isArray(data) && data.length > 0) {
      const result = data[0];
      if (
        typeof result.total_donations_amount === "number" &&
        typeof result.non_tithe_donation_amount === "number"
      ) {
        return result as ServerDonationData;
      }
    } else if (
      data &&
      typeof data.total_donations_amount === "number" &&
      typeof data.non_tithe_donation_amount === "number"
    ) {
      return data as ServerDonationData;
    }
    logger.warn(
      "AnalyticsService (Web): Received unexpected data structure from Supabase RPC for donations:",
      data
    );
    return { total_donations_amount: 0, non_tithe_donation_amount: 0 };
  } catch (error) {
    logger.error("Error in fetchTotalDonationsForUserWeb:", error);
    return null;
  }
}

async function fetchTotalDonationsForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerDonationData | null> {
  logger.log(
    `AnalyticsService (Desktop): Fetching total donations from ${startDate} to ${endDate}`
  );
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<ServerDonationData>(
      "get_desktop_total_donations_in_range",
      {
        startDate,
        endDate,
      }
    );
    if (
      result &&
      typeof result.total_donations_amount === "number" &&
      typeof result.non_tithe_donation_amount === "number"
    ) {
      return result;
    }
    logger.warn(
      "AnalyticsService (Desktop): Tauri command did not return expected ServerDonationData structure. Data:",
      result
    );
    return { total_donations_amount: 0, non_tithe_donation_amount: 0 };
  } catch (error) {
    logger.error("Error invoking get_desktop_total_donations_in_range:", error);
    return null;
  }
}

export async function fetchTotalDonationsInRange(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<ServerDonationData | null> {
  const currentPlatform = getPlatform();
  if (currentPlatform === "web") {
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        logger.error(
          "AnalyticsService: No authenticated user found for web operation."
        );
        return null;
      }
      userId = user.id;
    }
    return fetchTotalDonationsForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalDonationsForUserDesktop(startDate, endDate);
  } else {
    logger.warn(
      "AnalyticsService (fetchTotalDonationsInRange): Platform not determined."
    );
    return null;
  }
}

// --- TITHE BALANCE FUNCTIONS ---
async function fetchServerTitheBalanceWeb(
  userId: string
): Promise<number | null> {
  logger.log(
    `AnalyticsService (Web): Fetching overall tithe balance for user ${userId}`
  );
  try {
    const { data, error } = await supabase.rpc("calculate_user_tithe_balance", {
      p_user_id: userId,
    });

    if (error) {
      logger.error(
        "Error fetching overall tithe balance from Supabase RPC:",
        error
      );
      throw error;
    }
    if (typeof data === "number") {
      return data;
    } else {
      logger.warn(
        "AnalyticsService (Web): Received unexpected data structure from Supabase RPC for overall tithe balance:",
        data
      );
      return 0;
    }
  } catch (error) {
    logger.error("Error in fetchServerTitheBalanceWeb:", error);
    return null;
  }
}

async function fetchServerTitheBalanceDesktop(): Promise<number | null> {
  logger.log(`AnalyticsService (Desktop): Fetching overall tithe balance`);
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const balance = await invoke<number>("get_desktop_overall_tithe_balance");
    return balance;
  } catch (error) {
    logger.error("Error invoking get_desktop_overall_tithe_balance:", error);
    return null;
  }
}

export async function fetchServerTitheBalance(
  userId: string | null // userId is only needed for web
): Promise<number | null> {
  const currentPlatform = getPlatform();
  if (currentPlatform === "web") {
    if (!userId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        logger.error(
          "AnalyticsService: No authenticated user found for web operation."
        );
        return null;
      }
      userId = user.id;
    }
    return fetchServerTitheBalanceWeb(userId);
  } else if (currentPlatform === "desktop") {
    return fetchServerTitheBalanceDesktop();
  } else {
    logger.warn(
      "AnalyticsService (fetchServerTitheBalance): Platform not determined."
    );
    return null;
  }
}
