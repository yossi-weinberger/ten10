import { supabase } from "@/lib/supabaseClient";
import { useDonationStore } from "@/lib/store";
import { logger } from "@/lib/logger";
import { CurrencyCode } from "@/lib/currencies";

export const CurrencySyncService = {
  /**
   * Smartly syncs the default currency between the local Zustand store and the Supabase DB.
   * Logic:
   * 1. If Local has a custom setting (not ILS) and DB has default (ILS) -> Update DB to match Local.
   * 2. Otherwise -> Update Local to match DB (DB is source of truth).
   */
  async syncDefaultCurrency(userId: string) {
    try {
      // 1. Get DB Value
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("default_currency")
        .eq("id", userId)
        .single();

      if (error) {
        logger.error("CurrencySyncService: Failed to fetch profile currency:", error);
        return;
      }

      const dbCurrency = profile?.default_currency as CurrencyCode | null;
      const localCurrency = useDonationStore.getState().settings.defaultCurrency;

      logger.log(`CurrencySyncService: Checking sync. Local: ${localCurrency}, DB: ${dbCurrency}`);

      // Default fallback
      const DEFAULT_DB_VALUE = "ILS";

      // Case 1: Local has custom setting, DB has default -> Push Local to DB
      if (
        localCurrency &&
        localCurrency !== "ILS" &&
        (!dbCurrency || dbCurrency === DEFAULT_DB_VALUE)
      ) {
        logger.log(`CurrencySyncService: Pushing local currency (${localCurrency}) to DB.`);
        
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ default_currency: localCurrency })
          .eq("id", userId);

        if (updateError) {
          logger.error("CurrencySyncService: Failed to update DB currency:", updateError);
        } else {
          logger.log("CurrencySyncService: DB updated successfully.");
        }
      } 
      // Case 2: DB has a specific setting (different from Local), or Local is default -> Pull DB to Local
      else if (dbCurrency && dbCurrency !== localCurrency) {
        logger.log(`CurrencySyncService: Pulling DB currency (${dbCurrency}) to Local.`);
        
        useDonationStore.getState().updateSettings({
          defaultCurrency: dbCurrency
        });
        
        logger.log("CurrencySyncService: Local store updated.");
      } 
      else {
        logger.log("CurrencySyncService: Currency is already synced.");
      }

    } catch (err) {
      logger.error("CurrencySyncService: Unexpected error during sync:", err);
    }
  }
};
