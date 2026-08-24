import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";
import { getPlatform } from "@/lib/platformManager";
import { ONBOARDING_FEATURE_FLAG } from "./constants";

export function isNewUserOnboardingEnabled(): boolean {
  if (!isPostHogSupported()) {
    return getPlatform() === "desktop";
  }
  return posthog.isFeatureEnabled(ONBOARDING_FEATURE_FLAG) === true;
}
