import { invoke } from "@tauri-apps/api";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentPlatform } from "./platformService";

export interface ServerIncomeData {
  total_income: number;
  chomesh_amount: number;
}

// Web: Fetch total income and chomesh for a user from Supabase
async function fetchTotalIncomeForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerIncomeData | null> {
  console.log(
    `DbStatsCardsService (Web): Fetching total income for user ${userId} from ${startDate} to ${endDate}`
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
      console.error("Error fetching total income from Supabase RPC:", error);
      throw error;
    }
    console.log(
      "DbStatsCardsService (Web): Supabase RPC call successful. Data:",
      data
    );
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
      console.warn("Supabase RPC returned an array, taking the first element.");
      return data[0] as ServerIncomeData;
    } else {
      console.warn(
        "DbStatsCardsService (Web): Received unexpected data structure from Supabase RPC or null data:",
        data
      );
      return { total_income: 0, chomesh_amount: 0 };
    }
  } catch (error) {
    console.error("Error in fetchTotalIncomeForUserWeb:", error);
    return null;
  }
}

// Desktop: Fetch total income and chomesh in a date range from SQLite
async function fetchTotalIncomeForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<ServerIncomeData> {
  console.log(
    `DbStatsCardsService (Desktop): Fetching total income from ${startDate} to ${endDate}`
  );
  try {
    const result = await invoke<ServerIncomeData>(
      "get_desktop_total_income_in_range",
      {
        startDate,
        endDate,
      }
    );
    console.log(
      "DbStatsCardsService (Desktop): Tauri invoke successful. Data:",
      result
    );
    return result;
  } catch (error) {
    console.error("Error invoking get_desktop_total_income_in_range:", error);
    return { total_income: 0, chomesh_amount: 0 };
  }
}

// Wrapper function to fetch total income based on platform
export async function fetchDbCalculatedTotalIncomeForStatsCards(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<ServerIncomeData | null> {
  const currentPlatform = getCurrentPlatform();
  if (currentPlatform === "web") {
    if (!userId) {
      console.error(
        "DbStatsCardsService (fetchDbCalculatedTotalIncomeForStatsCards): User ID is required for web platform."
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "DbStatsCardsService: No authenticated user found for web operation."
        );
        return null;
      }
      return fetchTotalIncomeForUserWeb(user.id, startDate, endDate);
    }
    return fetchTotalIncomeForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalIncomeForUserDesktop(startDate, endDate);
  } else {
    console.warn(
      "DbStatsCardsService (fetchDbCalculatedTotalIncomeForStatsCards): Platform not determined. Cannot fetch income."
    );
    return null;
  }
}

// Web: Fetch total expenses for a user from Supabase
async function fetchTotalExpensesForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<number | null> {
  console.log(
    `DbStatsCardsService (Web): Fetching total expenses for user ${userId} from ${startDate} to ${endDate}`
  );
  try {
    const { data, error } = await supabase.rpc("get_total_expenses_for_user", {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("Error fetching total expenses from Supabase RPC:", error);
      throw error;
    }
    console.log(
      "DbStatsCardsService (Web): Supabase RPC call for expenses successful. Data:",
      data
    );
    if (typeof data === "number") {
      return data;
    } else {
      console.warn(
        "DbStatsCardsService (Web): Received unexpected data structure from Supabase RPC for expenses or null data:",
        data
      );
      return 0;
    }
  } catch (error) {
    console.error("Error in fetchTotalExpensesForUserWeb:", error);
    return null;
  }
}

// Desktop: Fetch total expenses in a date range from SQLite
async function fetchTotalExpensesForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<number> {
  console.log(
    `DbStatsCardsService (Desktop): Fetching total expenses from ${startDate} to ${endDate}`
  );
  try {
    const result = await invoke<number>("get_desktop_total_expenses_in_range", {
      startDate,
      endDate,
    });
    console.log(
      "DbStatsCardsService (Desktop): Tauri invoke for expenses successful. Data:",
      result
    );
    return result;
  } catch (error) {
    console.error("Error invoking get_desktop_total_expenses_in_range:", error);
    return 0;
  }
}

// Wrapper function to fetch total expenses based on platform
export async function fetchDbCalculatedTotalExpensesForStatsCards(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<number | null> {
  const currentPlatform = getCurrentPlatform();
  if (currentPlatform === "web") {
    if (!userId) {
      console.error(
        "DbStatsCardsService (fetchDbCalculatedTotalExpensesForStatsCards): User ID is required for web platform."
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "DbStatsCardsService: No authenticated user found for web operation (expenses)."
        );
        return null;
      }
      return fetchTotalExpensesForUserWeb(user.id, startDate, endDate);
    }
    return fetchTotalExpensesForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalExpensesForUserDesktop(startDate, endDate);
  } else {
    console.warn(
      "DbStatsCardsService (fetchDbCalculatedTotalExpensesForStatsCards): Platform not determined. Cannot fetch expenses."
    );
    return null;
  }
}

// Web: Fetch total donations for a user from Supabase
async function fetchTotalDonationsForUserWeb(
  userId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<number | null> {
  console.log(
    `DbStatsCardsService (Web): Fetching total donations for user ${userId} from ${startDate} to ${endDate}`
  );
  try {
    const { data, error } = await supabase.rpc("get_total_donations_for_user", {
      p_user_id: userId,
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      console.error("Error fetching total donations from Supabase RPC:", error);
      throw error;
    }
    console.log(
      "DbStatsCardsService (Web): Supabase RPC call for donations successful. Data:",
      data
    );
    if (typeof data === "number") {
      return data;
    } else {
      console.warn(
        "DbStatsCardsService (Web): Received unexpected data structure from Supabase RPC for donations or null data:",
        data
      );
      return 0;
    }
  } catch (error) {
    console.error("Error in fetchTotalDonationsForUserWeb:", error);
    return null;
  }
}

// Desktop: Fetch total donations in a date range from SQLite
async function fetchTotalDonationsForUserDesktop(
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<number | null> {
  console.log(
    `DbStatsCardsService (Desktop): Fetching total donations from ${startDate} to ${endDate}`
  );
  try {
    const result = await invoke<number>(
      "get_desktop_total_donations_in_range",
      {
        startDate,
        endDate,
      }
    );
    console.log(
      "DbStatsCardsService (Desktop): Tauri invoke for donations successful. Data:",
      result
    );
    return result;
  } catch (error) {
    console.error(
      "Error invoking get_desktop_total_donations_in_range:",
      error
    );
    return null;
  }
}

// Wrapper function to fetch total donations based on platform
export async function fetchDbCalculatedTotalDonationsForStatsCards(
  userId: string | null, // userId is only needed for web
  startDate: string,
  endDate: string
): Promise<number | null> {
  const currentPlatform = getCurrentPlatform();
  if (currentPlatform === "web") {
    if (!userId) {
      console.error(
        "DbStatsCardsService (fetchDbCalculatedTotalDonationsForStatsCards): User ID is required for web platform."
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "DbStatsCardsService: No authenticated user found for web operation (donations)."
        );
        return null;
      }
      userId = user.id;
    }
    return fetchTotalDonationsForUserWeb(userId, startDate, endDate);
  } else if (currentPlatform === "desktop") {
    return fetchTotalDonationsForUserDesktop(startDate, endDate);
  } else {
    console.warn(
      "DbStatsCardsService (fetchDbCalculatedTotalDonationsForStatsCards): Platform not determined. Cannot fetch donations."
    );
    return null;
  }
}

// Web: Fetch overall tithe balance for a user from Supabase
async function fetchServerTitheBalanceWeb(
  userId: string
): Promise<number | null> {
  console.log(
    `DbStatsCardsService (Web): Fetching overall tithe balance for user ${userId}`
  );
  try {
    const { data, error } = await supabase.rpc("calculate_user_tithe_balance", {
      p_user_id: userId,
    });

    if (error) {
      console.error(
        "Error fetching overall tithe balance from Supabase RPC:",
        error
      );
      throw error;
    }
    console.log(
      "DbStatsCardsService (Web): Supabase RPC call for overall tithe balance successful. Data:",
      data
    );
    if (typeof data === "number") {
      return data;
    } else {
      console.warn(
        "DbStatsCardsService (Web): Received unexpected data structure from Supabase RPC for overall tithe balance or null data:",
        data
      );
      return 0;
    }
  } catch (error) {
    console.error("Error in fetchServerTitheBalanceWeb:", error);
    return null;
  }
}

// Desktop: Fetch overall tithe balance from SQLite
async function fetchServerTitheBalanceDesktop(): Promise<number | null> {
  console.log(`DbStatsCardsService (Desktop): Fetching overall tithe balance`);
  try {
    const result = await invoke<number>("get_desktop_overall_tithe_balance");
    console.log(
      "DbStatsCardsService (Desktop): Tauri invoke for overall tithe balance successful. Data:",
      result
    );
    return result;
  } catch (error) {
    console.error("Error invoking get_desktop_overall_tithe_balance:", error);
    return null;
  }
}

// Wrapper function to fetch overall tithe balance based on platform
export async function fetchDbCalculatedTitheBalanceForStatsCards(
  userId: string | null // userId is only needed for web
): Promise<number | null> {
  const currentPlatform = getCurrentPlatform();
  if (currentPlatform === "web") {
    if (!userId) {
      console.error(
        "DbStatsCardsService (fetchDbCalculatedTitheBalanceForStatsCards): User ID is required for web platform."
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "DbStatsCardsService: No authenticated user found for web operation (tithe balance)."
        );
        return null;
      }
      userId = user.id;
    }
    return fetchServerTitheBalanceWeb(userId);
  } else if (currentPlatform === "desktop") {
    return fetchServerTitheBalanceDesktop();
  } else {
    console.warn(
      "DbStatsCardsService (fetchDbCalculatedTitheBalanceForStatsCards): Platform not determined. Cannot fetch overall tithe balance."
    );
    return null;
  }
}
