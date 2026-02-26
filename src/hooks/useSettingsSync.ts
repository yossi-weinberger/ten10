import { useEffect, useRef } from "react";
import { useDonationStore } from "@/lib/store";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { persistAllDesktopSettings } from "@/lib/services/desktop-settings.service";
import { PreferencesSyncService } from "@/lib/services/preferences-sync.service";
import { logger } from "@/lib/logger";

/**
 * Custom hook to centrally listen for changes in the application settings
 * and synchronize them to the appropriate persistent storage (Supabase for Web, SQLite for Desktop).
 */
export function useSettingsSync() {
  const { platform } = usePlatform();
  const { user } = useAuth();

  const settings = useDonationStore((state) => state.settings);
  const _hasHydrated = useDonationStore((state) => state._hasHydrated);

  // Keep track of the settings reference to prevent pushing on initial mount
  const prevSettings = useRef(settings);

  useEffect(() => {
    if (!_hasHydrated) return;

    // Prevent push if settings haven't actually changed (e.g. on initial user login)
    if (prevSettings.current === settings) return;
    prevSettings.current = settings;

    const syncSettings = async () => {
      try {
        if (platform === "web" && user) {
          const preferencesToPush =
            PreferencesSyncService.extractClientPreferences(settings);
          await PreferencesSyncService.pushPreferences(
            user.id,
            preferencesToPush,
          );
        } else if (platform === "desktop") {
          await persistAllDesktopSettings(settings);
        }
      } catch (err) {
        logger.error("Failed to sync settings centrally:", err);
      }
    };

    // Debounce the sync to avoid too many DB writes when settings change rapidly
    const timeoutId = setTimeout(syncSettings, 1000);
    return () => clearTimeout(timeoutId);
  }, [settings, platform, user, _hasHydrated]);
}
