// Define the notification options type locally to avoid import issues
interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: string;
}

/**
 * Shows a desktop notification.
 * It checks for permission and requests it if not already granted.
 *
 * @param options - The options for the notification (e.g., title, body).
 */
export async function showDesktopNotification(
  options: NotificationOptions
): Promise<void> {
  try {
    // @ts-expect-error -- Tauri-specific global
    if (!window.__TAURI_INTERNALS__) {
      console.warn("Notification service called in non-Tauri environment");
      return;
    }

    const { isPermissionGranted, requestPermission, sendNotification } =
      await import("@tauri-apps/plugin-notification");

    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    if (permissionGranted) {
      sendNotification(options);
    } else {
      console.log("User denied notification permission.");
    }
  } catch (error) {
    console.error("Error showing desktop notification:", error);
  }
}
