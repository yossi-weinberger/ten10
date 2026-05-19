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
   * Also syncs dedicated profile columns (reminder_day_of_month, reminder_enabled,
   * mailing_list_consent) which are excluded from client_preferences JSONB.
   */
  async syncPreferences(userId: string) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "client_preferences, reminder_day_of_month, reminder_enabled, mailing_list_consent",
        )
        .eq("id", userId)
        .single();

      if (error) {
        logger.error(
          "PreferencesSyncService: Failed to fetch preferences:",
          error,
        );
        return;
      }

      const dbPreferences =
        profile?.client_preferences as Partial<Settings> | null;
      const localSettings = useDonationStore.getState().settings;

      if (!dbPreferences) {
        // DB is empty (null). Local wins. Push to DB.
        logger.log(
          "PreferencesSyncService: DB preferences empty. Pushing local settings to DB.",
        );
        const preferencesToPush = this.extractClientPreferences(localSettings);
        await this.pushPreferences(userId, preferencesToPush);
      } else {
        // DB has preferences. Pull and merge into local.
        logger.log("PreferencesSyncService: Pulling preferences from DB.");
        useDonationStore.getState().updateSettings(dbPreferences);
      }

      // Always sync dedicated reminder columns from the profiles table.
      // These are not stored in client_preferences, so they must be fetched separately.
      const reminderUpdates: Partial<Settings> = {};
      if (profile?.reminder_day_of_month != null) {
        reminderUpdates.reminderDayOfMonth =
          profile.reminder_day_of_month as Settings["reminderDayOfMonth"];
      }
      if (profile?.reminder_enabled != null) {
        reminderUpdates.reminderEnabled = profile.reminder_enabled;
      }
      if (profile?.mailing_list_consent != null) {
        reminderUpdates.mailingListConsent = profile.mailing_list_consent;
      }
      if (Object.keys(reminderUpdates).length > 0) {
        logger.log(
          "PreferencesSyncService: Syncing reminder settings from DB:",
          reminderUpdates,
        );
        useDonationStore.getState().updateSettings(reminderUpdates);
      }
    } catch (err) {
      logger.error(
        "PreferencesSyncService: Unexpected error during sync:",
        err,
      );
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
        logger.error(
          "PreferencesSyncService: Failed to update client_preferences:",
          error,
        );
      } else {
        logger.log(
          "PreferencesSyncService: Successfully pushed preferences to DB.",
        );
      }
    } catch (err) {
      logger.error(
        "PreferencesSyncService: Unexpected error during push:",
        err,
      );
    }
  },
};
