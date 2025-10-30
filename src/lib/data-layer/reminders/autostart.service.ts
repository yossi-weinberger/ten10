import { logger } from "@/lib/logger";

/**
 * Checks if the application is set to launch on startup.
 * @returns A promise that resolves to true if autostart is enabled, false otherwise.
 */
export async function isAutostartEnabled(): Promise<boolean> {
  try {
    // @ts-expect-error -- Tauri-specific global
    if (!window.__TAURI_INTERNALS__) {
      logger.warn("Autostart service called in non-Tauri environment");
      return false;
    }

    const { isEnabled } = await import("@tauri-apps/plugin-autostart");
    return await isEnabled();
  } catch (error) {
    logger.error("Failed to check autostart status:", error);
    return false;
  }
}

/**
 * Enables the application to launch on startup.
 */
export async function enableAutostart(): Promise<void> {
  try {
    // @ts-expect-error -- Tauri-specific global
    if (!window.__TAURI_INTERNALS__) {
      logger.warn("Autostart service called in non-Tauri environment");
      return;
    }

    const { enable } = await import("@tauri-apps/plugin-autostart");
    await enable();
    logger.log("Autostart enabled.");
  } catch (error) {
    logger.error("Failed to enable autostart:", error);
  }
}

/**
 * Disables the application from launching on startup.
 */
export async function disableAutostart(): Promise<void> {
  try {
    // @ts-expect-error -- Tauri-specific global
    if (!window.__TAURI_INTERNALS__) {
      logger.warn("Autostart service called in non-Tauri environment");
      return;
    }

    const { disable } = await import("@tauri-apps/plugin-autostart");
    await disable();
    logger.log("Autostart disabled.");
  } catch (error) {
    logger.error("Failed to disable autostart:", error);
  }
}
