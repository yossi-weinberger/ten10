/**
 * Updater Service
 *
 * Handles application version checking and updates for desktop platform.
 * Uses Tauri's updater plugin for secure, signed updates.
 *
 * Note: Uses dynamic imports to avoid loading Tauri plugins in web environment.
 */

// import { invoke } from "@tauri-apps/api/core"; // STATIC IMPORT REMOVED - using dynamic imports instead

export interface AppVersion {
  current: string;
  available?: string;
  updateAvailable: boolean;
}

export interface UpdateInfo {
  version: string;
  date: string;
  body?: string;
}

/**
 * Get the current application version
 *
 * @returns Promise<string> - Current app version (e.g., "0.2.9")
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    // @ts-expect-error - __TAURI_INTERNALS__ is injected by Tauri
    if (!window.__TAURI_INTERNALS__) {
      return import.meta.env.VITE_APP_VERSION || "0.0.0";
    }

    const { invoke } = await import("@tauri-apps/api/core");
    const version = await invoke<string>("get_app_version");
    return version;
  } catch (error) {
    console.error("Failed to get app version:", error);
    // Fallback to package.json version
    return import.meta.env.VITE_APP_VERSION || "0.0.0";
  }
}

/**
 * Check if an update is available
 *
 * Desktop: Uses Tauri updater plugin to check GitHub releases
 * Web: Returns null (updates happen automatically via deployment)
 *
 * @returns Promise<UpdateInfo | null> - Update information if available, null otherwise
 */
export async function checkForUpdates(): Promise<UpdateInfo | null> {
  try {
    // Check if running on desktop (Tauri)
    // @ts-expect-error - __TAURI_INTERNALS__ is injected by Tauri
    if (!window.__TAURI_INTERNALS__) {
      console.log("Not running on desktop, updates not applicable");
      return null;
    }

    console.log("Checking for updates...");

    // Dynamic import to avoid loading in web environment
    const { check: checkUpdate } = await import("@tauri-apps/plugin-updater");
    const update = await checkUpdate();

    if (update) {
      console.log(`Update available: ${update.version}`);

      return {
        version: update.version,
        date: update.date || new Date().toISOString(),
        body: update.body,
      };
    }

    console.log("App is up to date");
    return null;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    throw new Error(
      `Update check failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Download and install an update
 *
 * This combines download and install steps, and restarts the app when done.
 * Shows progress in console logs.
 *
 * @returns Promise<void>
 */
export async function downloadAndInstallUpdate(): Promise<void> {
  try {
    // Check if running on desktop
    // @ts-expect-error - __TAURI_INTERNALS__ is injected by Tauri
    if (!window.__TAURI_INTERNALS__) {
      throw new Error("Updates are only available on desktop");
    }

    const { check: checkUpdate } = await import("@tauri-apps/plugin-updater");
    const update = await checkUpdate();

    if (!update) {
      throw new Error("No update available");
    }

    console.log(`Downloading and installing update ${update.version}...`);

    await update.downloadAndInstall((progress) => {
      // Handle different progress event types
      if (progress.event === "Started") {
        console.log(
          `Download started, size: ${
            progress.data.contentLength || "unknown"
          } bytes`
        );
      } else if (progress.event === "Progress") {
        const downloaded = progress.data.chunkLength;
        console.log(`Download progress: ${downloaded} bytes received`);
        // Note: Total size not available in Progress events, only in Started
      } else if (progress.event === "Finished") {
        console.log("Download finished");
      }
    });

    console.log(
      "Update installed successfully. App will restart automatically."
    );
  } catch (error) {
    console.error("Failed to install update:", error);
    throw new Error(
      `Update installation failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get app version info with update availability
 *
 * @returns Promise<AppVersion> - Version information
 */
export async function getVersionInfo(): Promise<AppVersion> {
  const current = await getCurrentVersion();

  try {
    const updateInfo = await checkForUpdates();

    if (updateInfo) {
      return {
        current,
        available: updateInfo.version,
        updateAvailable: true,
      };
    }
  } catch (error) {
    console.error("Failed to check for updates:", error);
  }

  return {
    current,
    updateAvailable: false,
  };
}

/**
 * Check if the app is running on desktop (Tauri)
 *
 * @returns boolean - True if running on desktop
 */
export function isDesktopPlatform(): boolean {
  // @ts-expect-error - __TAURI_INTERNALS__ is injected by Tauri
  return typeof window !== "undefined" && !!window.__TAURI_INTERNALS__;
}
