import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";
import { getPlatform } from "@/lib/platformManager";

export const AI_INTAKE_WEB_FLAG = "ai_intake_web";

/** Web only. Missing or false flag stays off. Desktop never shows the intake shell. */
export function isAiIntakeEnabled(): boolean {
  if (getPlatform() !== "web" || !isPostHogSupported()) {
    return false;
  }
  return posthog.isFeatureEnabled(AI_INTAKE_WEB_FLAG) === true;
}

/** The same gate as the other web-only sidebar items: web, a signed-in user, and the flag. */
export function showAiIntakeUi(platform: string, signedIn: boolean): boolean {
  if (platform !== "web" || !signedIn) return false;
  return isAiIntakeEnabled();
}

/** Network calls stop unless the platform is already known to be web. */
export function aiCallsAllowed(): boolean {
  return getPlatform() === "web";
}
