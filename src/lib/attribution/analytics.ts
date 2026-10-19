import { applyStoredAttributionToPostHog } from "@/lib/analytics/posthogClient";

/** Super-properties + first-touch `$set_once` so later events carry the source. */
export function registerAttributionWithPostHog(): void {
  applyStoredAttributionToPostHog();
}
