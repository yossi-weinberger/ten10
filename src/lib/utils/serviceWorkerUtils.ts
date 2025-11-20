import { logger } from "../logger";

/**
 * Unregisters all service workers if running in a Tauri environment.
 * This is crucial to prevent stale service workers from intercepting requests
 * and serving old cached content in the desktop app.
 */
export async function unregisterServiceWorkersInTauri() {
  // Check if running in Tauri environment
  const isTauri = !!window.__TAURI_INTERNALS__;

  if (isTauri) {
    if ("serviceWorker" in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          logger.log(
            `[SW-Cleanup] Found ${registrations.length} service workers in Tauri. Unregistering...`
          );

          const results = await Promise.all(
            registrations.map(async (registration) => {
              const result = await registration.unregister();
              return { scope: registration.scope, success: result };
            })
          );

          results.forEach(({ scope, success }) => {
            if (success) {
              logger.log(
                `[SW-Cleanup] Service Worker at ${scope} unregistered successfully.`
              );
            } else {
              logger.warn(
                `[SW-Cleanup] Failed to unregister Service Worker at ${scope}.`
              );
            }
          });

          // If we successfully unregistered any SW, we might want to log it clearly
          // because the *next* reload will be the one that actually fetches fresh content.
          logger.info(
            "[SW-Cleanup] Cleanup complete. Next app restart should load fresh content."
          );
        } else {
          logger.debug(
            "[SW-Cleanup] No service workers found in Tauri. Clean state."
          );
        }
      } catch (error) {
        logger.error(
          "[SW-Cleanup] Error unregistering service workers:",
          error
        );
      }
    }
  }
}
