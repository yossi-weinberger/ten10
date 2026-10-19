import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";
import { attributionProperties } from "./capture";

/** Super-properties so later events (including signup) carry the source. */
export function registerAttributionWithPostHog(): void {
  if (!isPostHogSupported()) return;
  const properties = attributionProperties();
  if (Object.keys(properties).length === 0) return;
  posthog.register(properties);
}
