import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";

type ProductAnalyticsEvent =
  | "transaction_created"
  | "transaction_updated"
  | "recurring_obligation_created"
  | "analytics_opened"
  | "analytics_date_range_changed"
  | "analytics_pdf_exported"
  | "transaction_import_started"
  | "transaction_import_mapping_completed"
  | "transaction_import_completed"
  | "transaction_import_failed";

type ProductAnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

export function trackProductEvent(
  event: ProductAnalyticsEvent,
  properties: ProductAnalyticsProperties = {}
) {
  if (!isPostHogSupported()) return;

  posthog.capture(event, {
    platform: "web",
    ...properties,
  });
}
