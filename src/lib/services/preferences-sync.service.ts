import { supabase } from "@/lib/supabaseClient";
import { useDonationStore, Settings } from "@/lib/store";
import { logger } from "@/lib/logger";

export const PreferencesSyncService = {
  /**
   * Extracts only the settings that should be stored in client_preferences JSONB.
   * Fields that have dedicated columns in the profiles table are omitted.
   */
  extractClientPreferences(settings: Settings): Partial<Settings> {
    const {
      defaultCurrency,
      reminderEnabled,
      reminderDayOfMonth,
      mailingListConsent,
      lastSeenVersion,
      termsAcceptedVersion,
      ...preferences
    } = settings;
    return preferences;
  },

  /**
   * Syncs the user preferences between local store and Supabase.
   * If DB has no preferences (null), local wins and is pushed to DB.
   * If DB has preferences, they are merged into local store.
   */
  async syncPreferences(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("client_preferences")
        .eq("id", userId)
        .single();

      if (error) {
        logger.error("PreferencesSyncService: Failed to fetch client_preferences:", error);
        return;
      }

      const dbPreferences = profile?.client_preferences as Partial<Settings> | null;
      const localSettings = useDonationStore.getState().settings;

      if (!dbPreferences) {
        // DB is empty (null). Local wins. Push to DB.
        logger.log("PreferencesSyncService: DB preferences empty. Pushing local settings to DB.");
        const preferencesToPush = this.extractClientPreferences(localSettings);
        await this.pushPreferences(userId, preferencesToPush);
      } else {
        // DB has preferences. Pull and merge into local.
        logger.log("PreferencesSyncService: Pulling preferences from DB.");
        useDonationStore.getState().updateSettings(dbPreferences);
      }
    } catch (err) {
      logger.error("PreferencesSyncService: Unexpected error during sync:", err);
    }
  },

  /**
   * Pushes the given preferences object to the DB.
   */
  async pushPreferences(userId: string, preferences: Partial<Settings>) {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ client_preferences: preferences })
        .eq("id", userId);
        
      if (error) {
        logger.error("PreferencesSyncService: Failed to update client_preferences:", error);
      } else {
        logger.log("PreferencesSyncService: Successfully pushed preferences to DB.");
      }
    } catch (err) {
      logger.error("PreferencesSyncService: Unexpected error during push:", err);
    }
  }
};
