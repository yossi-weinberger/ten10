import posthog from "posthog-js";
import { isPostHogSupported } from "@/lib/analytics/posthogClient";

export type ProductAnalyticsEvent =
  | "transaction_created"
  | "transaction_updated"
  | "transaction_deleted"
  | "transaction_validation_failed"
  | "recurring_obligation_created"
  | "recurring_obligation_updated"
  | "recurring_obligation_paused"
  | "recurring_obligation_resumed"
  | "recurring_obligation_deleted"
  | "analytics_opened"
  | "analytics_date_range_changed"
  | "analytics_pdf_exported"
  | "transaction_import_started"
  | "transaction_import_mapping_completed"
  | "transaction_import_completed"
  | "transaction_import_failed"
  | "signup_completed"
  | "login_completed"
  | "logout_completed"
  | "password_reset_requested"
  | "terms_accepted"
  | "transactions_exported"
  | "settings_changed"
  | "reminder_preference_changed"
  | "category_created"
  | "contact_form_submitted";

type ProductAnalyticsProperties = Record<
  string,
  string | number | boolean | null | undefined | string[]
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
