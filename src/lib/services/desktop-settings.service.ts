import { invoke } from "@tauri-apps/api/core";
import { useDonationStore } from "@/lib/store";
import { logger } from "@/lib/logger";
import { CURRENCIES } from "@/lib/currencies";
import type { CurrencyCode } from "@/lib/currencies";
import type { Language } from "@/lib/store";

type Theme = "light" | "dark" | "system";

const VALID_CURRENCIES = new Set(CURRENCIES.map((c) => c.code));
const VALID_LANGUAGES = new Set<Language>(["he", "en"]);
const VALID_THEMES = new Set<Theme>(["light", "dark", "system"]);

function isValidCurrency(code: string | null | undefined): code is CurrencyCode {
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
 * Persist a generic app setting to SQLite on desktop.
 * Survives WebView cache wipe during app update.
 */
export function persistDesktopSetting(key: string, value: string): void {
  import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke("set_app_setting", { key, value }))
    .catch((err) => logger.error(`Failed to persist ${key} (desktop):`, err));
}

/**
 * Persist default currency to SQLite on desktop.
 * Survives WebView cache wipe during app update.
 */
export function persistDefaultCurrency(currency: string): void {
  import("@tauri-apps/api/core")
    .then(({ invoke }) => invoke("set_default_currency", { currency }))
    .catch((err) =>
      logger.error("Failed to persist default currency (desktop):", err)
    );
}

/**
 * Restores settings from SQLite on desktop init.
 * Survives WebView cache wipe during app update (clean-webview.nsh).
 * Returns theme so caller can sync ThemeProvider (which uses separate localStorage).
 */
export async function restoreDesktopSettings(): Promise<RestoredDesktopSettings> {
  const result: RestoredDesktopSettings = {};
  const store = useDonationStore.getState();
  const settings = store.settings;

  try {
    // --- Currency ---
    const storedCurrency = await invoke<string | null>("get_default_currency");
    if (isValidCurrency(storedCurrency)) {
      logger.log(
        `DesktopSettingsService: Restored default_currency from SQLite: ${storedCurrency}`
      );
      store.updateSettings({ defaultCurrency: storedCurrency });
    } else {
      const inferred =
        await invoke<string | null>("infer_default_currency_from_transactions");
      if (isValidCurrency(inferred)) {
        logger.log(
          `DesktopSettingsService: Inferred default_currency from transactions: ${inferred}`
        );
        store.updateSettings({ defaultCurrency: inferred });
        await invoke("set_default_currency", { currency: inferred });
      } else if (
        isValidCurrency(settings.defaultCurrency) &&
        settings.defaultCurrency !== "ILS"
      ) {
        await invoke("set_default_currency", {
          currency: settings.defaultCurrency,
        });
      }
    }

    // --- Language ---
    const storedLang = await invoke<string | null>("get_app_setting", {
      key: "language",
    });
    if (isValidLanguage(storedLang)) {
      logger.log(
        `DesktopSettingsService: Restored language from SQLite: ${storedLang}`
      );
      store.updateSettings({ language: storedLang });
    } else if (
      isValidLanguage(settings.language) &&
      settings.language !== "he"
    ) {
      await invoke("set_app_setting", {
        key: "language",
        value: settings.language,
      });
    }

    // --- Theme ---
    const storedTheme = await invoke<string | null>("get_app_setting", {
      key: "theme",
    });
    if (isValidTheme(storedTheme)) {
      logger.log(
        `DesktopSettingsService: Restored theme from SQLite: ${storedTheme}`
      );
      store.updateSettings({ theme: storedTheme });
      result.theme = storedTheme;
    } else if (
      isValidTheme(settings.theme) &&
      settings.theme !== "system"
    ) {
      await invoke("set_app_setting", {
        key: "theme",
        value: settings.theme,
      });
    }

    // --- Auto-lock timeout ---
    const storedTimeout = await invoke<string | null>("get_app_setting", {
      key: "autoLockTimeoutMinutes",
    });
    if (storedTimeout !== null && storedTimeout !== undefined) {
      const num = parseInt(storedTimeout, 10);
      if (!isNaN(num) && num >= 0) {
        logger.log(
          `DesktopSettingsService: Restored autoLockTimeoutMinutes from SQLite: ${num}`
        );
        store.updateSettings({ autoLockTimeoutMinutes: num });
      }
    } else if (
      settings.autoLockTimeoutMinutes !== undefined &&
      settings.autoLockTimeoutMinutes !== 10
    ) {
      await invoke("set_app_setting", {
        key: "autoLockTimeoutMinutes",
        value: String(settings.autoLockTimeoutMinutes),
      });
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
