import { useDonationStore } from "@/lib/store";
import { fetchServerTitheBalance } from "../analytics.service";
import { showDesktopNotification } from "./notification.service";
import { TFunction } from "i18next";
import { logger } from "@/lib/logger";

const LAST_REMINDER_DATE_KEY = "lastReminderDate";

/**
 * Generates the title and body for a reminder notification based on the tithe balance.
 * This logic is adapted from the web email reminder service.
 * @param t - The translation function.
 * @param titheBalance - The user's current tithe balance.
 * @returns An object with title and body for the notification.
 */
function generateReminderContent(t: TFunction, titheBalance: number) {
  const isPositive = titheBalance > 0.005; // Use a small tolerance
  const isNegative = titheBalance < -0.005;
  const absBalance = Math.abs(titheBalance).toFixed(2); // Always format to 2 decimal places

  let title: string;
  let body: string;

  if (isPositive) {
    title = t("reminders.positive.title");
    body = t("reminders.positive.body", { amount: absBalance });
  } else if (isNegative) {
    title = t("reminders.negative.title");
    body = t("reminders.negative.body", { amount: absBalance });
  } else {
    title = t("reminders.zero.title");
    body = t("reminders.zero.body");
  }

  return { title, body };
}

/**
 * Checks if a reminder should be sent today and, if so, sends a desktop notification.
 * This function is intended to be called once on application startup for desktop clients.
 * It prevents sending multiple notifications on the same day.
 * @param t - The translation function from i18next.
 */
export async function checkAndSendDesktopReminder(t: TFunction): Promise<void> {
  logger.log("Starting desktop reminder check...");
  try {
    const { settings } = useDonationStore.getState();
    const { reminderEnabled: enabled, reminderDayOfMonth: dayOfMonth } =
      settings;

    logger.log("Reminder settings:", { enabled, dayOfMonth });
    if (!enabled) {
      logger.log("Reminders are disabled in settings. Exiting.");
      return;
    }

    const today = new Date();
    const currentDayOfMonth = today.getDate();

    // NOTE: This check is temporarily disabled for testing.
    if (currentDayOfMonth !== dayOfMonth) {
      logger.log(
        `Today is day ${currentDayOfMonth}, but reminder is set for day ${dayOfMonth}. Exiting.`
      );
      return;
    }

    const lastReminderDate = localStorage.getItem(LAST_REMINDER_DATE_KEY);
    const todayStr = today.toISOString().split("T")[0];

    logger.log(
      "Last reminder sent on:",
      lastReminderDate,
      "| Today is:",
      todayStr
    );
    if (lastReminderDate === todayStr) {
      logger.log("Reminder already sent today. Exiting.");
      return;
    }

    logger.log("Fetching tithe balance...");
    const titheBalance = await fetchServerTitheBalance(null); // null for desktop user_id
    if (titheBalance === null) {
      logger.error("Could not fetch tithe balance for reminder. Exiting.");
      return;
    }
    logger.log("Tithe balance fetched:", titheBalance);

    const { title, body } = generateReminderContent(t, titheBalance);
    logger.log("Generated notification content:", { title, body });

    logger.log("Attempting to show desktop notification...");
    await showDesktopNotification({ title, body });
    logger.log("Desktop notification process finished.");

    localStorage.setItem(LAST_REMINDER_DATE_KEY, todayStr);
  } catch (error) {
    logger.error("Error in checkAndSendDesktopReminder:", error);
  }
}
