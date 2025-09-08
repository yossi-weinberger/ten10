import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
  type NotificationOptions,
} from "@tauri-apps/plugin-notification";

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
