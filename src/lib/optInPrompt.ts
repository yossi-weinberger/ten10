import { logger } from "@/lib/logger";

const STORAGE_KEY_PREFIX = "ten10_opt_in_prompt_shown_";

export function markOptInPromptAsShown(userId: string): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, "true");
  } catch (error) {
    logger.error("Failed to mark opt-in prompt as shown:", error);
  }
}

export function hasOptInPromptBeenShown(userId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`) === "true";
  } catch {
    return false;
  }
}
