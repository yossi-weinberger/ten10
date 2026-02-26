import { useDonationStore, Settings } from "@/lib/store";
import { logger } from "@/lib/logger";
import { getPlatform } from "@/lib/platformManager";
import { CURRENCIES } from "@/lib/currencies";
import type { CurrencyCode } from "@/lib/currencies";
import type { Language } from "@/lib/store";

type Theme = "light" | "dark" | "system";

const VALID_CURRENCIES = new Set(CURRENCIES.map((c) => c.code));
const VALID_LANGUAGES = new Set<Language>(["he", "en"]);
const VALID_THEMES = new Set<Theme>(["light", "dark", "system"]);

function isValidCurrency(
  code: string | null | undefined,
): code is CurrencyCode {
  return !!code && VALID_CURRENCIES.has(code as CurrencyCode);
}

function isValidLanguage(code: string | null | undefined): code is Language {
  return !!code && VALID_LANGUAGES.has(code as Language);
}

function isValidTheme(code: string | null | undefined): code is Theme {
  return !!code && VALID_THEMES.has(code as Theme);
}

export interface RestoredDesktopSettings {
  theme?: Theme;
}

/**
 * Persist the entire settings object to SQLite as JSON.
 * Survives WebView cache wipe during app update.
 * No-op on web.
 */
export async function persistAllDesktopSettings(settings: Settings): Promise<void> {
  if (getPlatform() !== "desktop") return;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("set_app_setting", { 
      key: "client_preferences", 
      value: JSON.stringify(settings) 
    });
  } catch (err) {
    logger.error("Failed to persist all desktop settings:", err);
  }
}

/**
 * @deprecated Handled automatically by the centralized store listener using persistAllDesktopSettings.
 */
export function persistDesktopSetting(key: string, value: string): void {
  // We keep this as a no-op or fallback. The central listener handles it.
  logger.log(`persistDesktopSetting called for ${key} - ignoring in favor of central listener.`);
}

/**
 * @deprecated Handled automatically by the centralized store listener using persistAllDesktopSettings.
 */
export function persistDefaultCurrency(currency: string): void {
  // We keep this as a no-op or fallback. The central listener handles it.
  logger.log(`persistDefaultCurrency called for ${currency} - ignoring in favor of central listener.`);
}

/**
 * Restores settings from SQLite on desktop init.
 * Survives WebView cache wipe during app update (clean-webview.nsh).
 * Returns theme so caller can sync ThemeProvider (which uses separate localStorage).
 */
export async function restoreDesktopSettings(): Promise<RestoredDesktopSettings> {
  if (getPlatform() !== "desktop") {
    return {};
  }

  const result: RestoredDesktopSettings = {};
  const store = useDonationStore.getState();
  const settings = store.settings;

  // Dynamic import to avoid bundling Tauri in web builds
  const { invoke } = await import("@tauri-apps/api/core");

  try {
    // 1. Try to read the new centralized client_preferences
    const storedPreferencesStr = await invoke<string | null>("get_app_setting", {
      key: "client_preferences",
    });

    if (storedPreferencesStr) {
      try {
        const parsed = JSON.parse(storedPreferencesStr);
        logger.log("DesktopSettingsService: Restored client_preferences from SQLite.");
        store.updateSettings(parsed);
        if (isValidTheme(parsed.theme)) {
          result.theme = parsed.theme;
        }
        return result;
      } catch (parseErr) {
        logger.error("DesktopSettingsService: Failed to parse client_preferences JSON:", parseErr);
        // Fall back to legacy individual keys if parsing fails
      }
    }

    // 2. Fallback to legacy individual keys
    logger.log("DesktopSettingsService: No valid client_preferences found. Falling back to individual keys.");

    // --- Currency ---
    const storedCurrency = await invoke<string | null>("get_default_currency");
    if (isValidCurrency(storedCurrency)) {
      logger.log(`DesktopSettingsService: Restored legacy default_currency: ${storedCurrency}`);
      store.updateSettings({ defaultCurrency: storedCurrency });
    } else {
      const inferred = await invoke<string | null>("infer_default_currency_from_transactions");
      if (isValidCurrency(inferred)) {
        logger.log(`DesktopSettingsService: Inferred default_currency: ${inferred}`);
        store.updateSettings({ defaultCurrency: inferred });
      }
    }

    // --- Language ---
    const storedLang = await invoke<string | null>("get_app_setting", { key: "language" });
    if (isValidLanguage(storedLang)) {
      logger.log(`DesktopSettingsService: Restored legacy language: ${storedLang}`);
      store.updateSettings({ language: storedLang });
    }

    // --- Theme ---
    const storedTheme = await invoke<string | null>("get_app_setting", { key: "theme" });
    if (isValidTheme(storedTheme)) {
      logger.log(`DesktopSettingsService: Restored legacy theme: ${storedTheme}`);
      store.updateSettings({ theme: storedTheme });
      result.theme = storedTheme;
    }

    // --- Auto-lock timeout ---
    const storedTimeout = await invoke<string | null>("get_app_setting", { key: "autoLockTimeoutMinutes" });
    if (storedTimeout !== null && storedTimeout !== undefined) {
      const num = parseInt(storedTimeout, 10);
      if (!isNaN(num) && num >= 0) {
        logger.log(`DesktopSettingsService: Restored legacy autoLockTimeoutMinutes: ${num}`);
        store.updateSettings({ autoLockTimeoutMinutes: num });
      }
    }
    
    // After fallback, let's persist the combined preferences so next time it's fast
    await persistAllDesktopSettings(useDonationStore.getState().settings);

    // Clean up legacy keys from SQLite so they don't cause confusion
    try {
      await invoke("delete_app_setting", { key: "default_currency" });
      await invoke("delete_app_setting", { key: "language" });
      await invoke("delete_app_setting", { key: "theme" });
      await invoke("delete_app_setting", { key: "autoLockTimeoutMinutes" });
      logger.log("DesktopSettingsService: Cleaned up legacy keys from SQLite.");
    } catch (cleanupErr) {
      logger.error("DesktopSettingsService: Failed to clean up legacy keys:", cleanupErr);
    }

  } catch (err) {
    logger.error("DesktopSettingsService: Failed to restore settings:", err);
  }

  return result;
}

/** @deprecated Use restoreDesktopSettings */
export async function restoreDesktopDefaultCurrency(): Promise<void> {
  await restoreDesktopSettings();
}
