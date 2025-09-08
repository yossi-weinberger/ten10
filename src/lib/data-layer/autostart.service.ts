import { isEnabled, enable, disable } from "@tauri-apps/plugin-autostart";

/**
 * Checks if the application is set to launch on startup.
 * @returns A promise that resolves to true if autostart is enabled, false otherwise.
 */
export async function isAutostartEnabled(): Promise<boolean> {
  try {
    return await isEnabled();
  } catch (error) {
    console.error("Failed to check autostart status:", error);
    return false;
  }
}

/**
 * Enables the application to launch on startup.
 */
export async function enableAutostart(): Promise<void> {
  try {
    await enable();
    console.log("Autostart enabled.");
  } catch (error) {
    console.error("Failed to enable autostart:", error);
  }
}

/**
 * Disables the application from launching on startup.
 */
export async function disableAutostart(): Promise<void> {
  try {
    await disable();
    console.log("Autostart disabled.");
  } catch (error) {
    console.error("Failed to disable autostart:", error);
  }
}
