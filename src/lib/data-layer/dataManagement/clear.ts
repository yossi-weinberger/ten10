import { useDonationStore } from "../../store";
import { getPlatform } from "../../platformManager";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

export async function clearAllData() {
  const currentPlatform = getPlatform();
  logger.log(
    "DataManagementService: Clearing all data. Platform:",
    currentPlatform
  );
  if (currentPlatform === "desktop") {
    try {
      logger.log("Invoking clear_all_data...");
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("clear_all_data");
      logger.log("SQLite data cleared successfully via invoke.");
    } catch (error) {
      logger.error("Error invoking clear_all_data:", error);
      throw error;
    }
  } else if (currentPlatform === "web") {
    try {
      const { error } = await supabase.rpc("clear_all_user_data");

      if (error) {
        logger.error("Error calling clear_all_user_data RPC:", error);
        throw error;
      }

      logger.log("Successfully cleared user data via RPC.");
    } catch (error) {
      logger.error("Error clearing Supabase data:", error);
      throw error; // Re-throw the error to be caught by the calling function
    }
  }

  logger.log("Clearing Zustand store...");
  // After clearing data, we need to signal that any cached data is now stale.
  // Setting the fetch timestamp to a new value will trigger data re-fetching
  // in components that depend on it.
  useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
  logger.log("Zustand store updated to reflect data changes.");
}
