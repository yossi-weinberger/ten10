import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";
import { getPlatform } from "@/lib/platformManager";

export const AI_INTAKE_WEB_FLAG = "ai_intake_web";

/**
 * Kill switch: true only when VITE_AI_INTAKE_ENABLED is explicitly "true".
 * Safe by default: false when undefined, empty, or false.
 */
export function isAiFeatureFlagEnabled(): boolean {
  return import.meta.env.VITE_AI_INTAKE_ENABLED === "true";
}

/** Web only. Missing or false flag stays off. Desktop never shows the intake shell. */
export function isAiIntakeEnabled(): boolean {
  if (!isAiFeatureFlagEnabled()) {
    return false;
  }
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

/** Network calls stop unless AI feature is enabled and the platform is already known to be web. */
export function aiCallsAllowed(): boolean {
  if (!isAiFeatureFlagEnabled()) {
    return false;
  }
  return getPlatform() === "web";
}
