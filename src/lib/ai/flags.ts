import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";
import { getPlatform } from "@/lib/platformManager";

export const AI_INTAKE_WEB_FLAG = "ai_intake_web";

/** Web only. Missing or false flag stays off. Desktop never shows the intake shell. */
export function isAiIntakeEnabled(): boolean {
  if (getPlatform() === "desktop" || !isPostHogSupported()) {
    return false;
  }
  return posthog.isFeatureEnabled(AI_INTAKE_WEB_FLAG) === true;
}
