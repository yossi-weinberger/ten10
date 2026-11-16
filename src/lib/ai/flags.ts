import { useEffect, useReducer } from "react";
import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";
import { getPlatform } from "@/lib/platformManager";
import { isCachedAiAccessAllowed, subscribeAiAccessCache } from "@/lib/ai/ai-access-cache";

export const AI_INTAKE_WEB_FLAG = "ai_intake_web";

/**
 * Kill switch: true only when VITE_AI_INTAKE_ENABLED is explicitly "true".
 * Safe by default: false when undefined, empty, or false.
 */
export function isAiFeatureFlagEnabled(): boolean {
  return import.meta.env.VITE_AI_INTAKE_ENABLED === "true";
}

/** Web only. Missing or false flag stays off. Desktop never shows the intake shell. Hidden until plan access arrives. */
export function isAiIntakeEnabled(): boolean {
  if (!isAiFeatureFlagEnabled()) {
    return false;
  }
  if (getPlatform() !== "web" || !isPostHogSupported()) {
    return false;
  }
  if (posthog.isFeatureEnabled(AI_INTAKE_WEB_FLAG) !== true) {
    return false;
  }
  return isCachedAiAccessAllowed();
}

/** The same gate as the other web-only sidebar items: web, a signed-in user, and the flag. */
export function showAiIntakeUi(platform: string, signedIn: boolean): boolean {
  if (platform !== "web" || !signedIn) return false;
  return isAiIntakeEnabled();
}

/**
 * showAiIntakeUi for components: it reads the flag again when PostHog loads or changes flags,
 * e.g. right after login, instead of keeping whatever the first render saw.
 * Also rereads the plan-access cache filled by useMyAiAccess.
 */
export function useAiIntakeUi(platform: string, signedIn: boolean): boolean {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => subscribeAiAccessCache(() => rerender()), []);
  useEffect(() => {
    if (!isAiFeatureFlagEnabled() || !isPostHogSupported()) return;
    return posthog.onFeatureFlags(() => rerender());
  }, []);
  return showAiIntakeUi(platform, signedIn);
}

/** Network calls stop unless AI feature is enabled, the platform is web, and the user has a plan. */
export function aiCallsAllowed(): boolean {
  if (!isAiFeatureFlagEnabled()) {
    return false;
  }
  if (getPlatform() !== "web") {
    return false;
  }
  return isCachedAiAccessAllowed();
}
