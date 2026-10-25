import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import type { User } from "@supabase/supabase-js";
import { scrubSensitiveUrl } from "./urlScrubbing";

type PostHogEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * Well-known, harmless browser errors that fire without breaking anything.
 * These add pure noise to error tracking, so we drop them before they create
 * issues. `capture_exceptions` stays on so real bugs are still reported.
 */
const BENIGN_ERROR_MESSAGES = [
  // ResizeObserver fires this when it can't deliver all resize callbacks within
  // one animation frame. Harmless; triggered by any ResizeObserver-based layout
  // (our Sidebar slider, recharts, radix, etc.).
  "ResizeObserver loop completed with undelivered notifications.",
  "ResizeObserver loop limit exceeded",
  // Generic network hiccups from cancelled/failed fetches and script loads.
  "Non-Error promise rejection captured",
  // posthog-js aborts its own outgoing request after 3000ms and reports the
  // AbortError back through `capture_exceptions`. It is SDK network noise, not
  // an app bug, so we drop it here.
  "PostHog request timed out after",
];

/**
 * URL-valued event properties that can carry the OAuth callback fragment
 * (`#access_token=…&refresh_token=…`) into pageviews and session-recording
 * metadata. We scrub these on every outgoing event as a defence-in-depth layer
 * behind the explicit scrubbing at each capture site.
 */
const URL_PROPERTY_KEYS = [
  "$current_url",
  "$referrer",
  "$initial_current_url",
  "$initial_referrer",
  "$pathname",
] as const;

/**
 * Redacts authentication material from any URL-valued properties on the event.
 * Runs for all events (including `$snapshot`, which sets the recording's start
 * URL) so credentials never reach PostHog regardless of the capture path.
 */
function scrubUrlProperties(event: CaptureResult | null): CaptureResult | null {
  if (!event?.properties) return event;

  for (const key of URL_PROPERTY_KEYS) {
    const value = event.properties[key];
    if (typeof value === "string" && value.length > 0) {
      event.properties[key] = scrubSensitiveUrl(value);
    }
  }

  return event;
}

/**
 * Drops `$exception` events whose message matches a known-benign browser
 * warning. Returns the event unchanged for everything else.
 */
function dropBenignExceptions(
  event: CaptureResult | null
): CaptureResult | null {
  if (!event || event.event !== "$exception") return event;

  const exceptionList = event.properties?.$exception_list;
  if (!Array.isArray(exceptionList)) return event;

  const isBenign = exceptionList.some((exception) => {
    const value: unknown = exception?.value;
    return (
      typeof value === "string" &&
      BENIGN_ERROR_MESSAGES.some((benign) => value.includes(benign))
    );
  });

  return isBenign ? null : event;
}

/**
 * Default production hosts that should report analytics.
 * Can be overridden via VITE_POSTHOG_ALLOWED_HOSTS env var (comma-separated).
 */
const DEFAULT_PROD_HOSTS = ["ten10-app.com", "www.ten10-app.com"];

/**
 * Determines if the current host is a production host that should report analytics.
 */
export function isProductionHost(): boolean {
  if (typeof window === "undefined") return false;

  const currentHost = window.location.hostname;
  const allowedHostsEnv = import.meta.env.VITE_POSTHOG_ALLOWED_HOSTS;
  const allowedHosts = allowedHostsEnv
    ? allowedHostsEnv.split(",").map((h: string) => h.trim())
    : DEFAULT_PROD_HOSTS;

  return allowedHosts.includes(currentHost);
}

/**
 * Determines the environment type based on the current host.
 */
export function getEnvironmentType(): "prod" | "preview" | "dev" {
  if (typeof window === "undefined") return "dev";

  const currentHost = window.location.hostname;

  if (isProductionHost()) return "prod";
  if (currentHost.includes("vercel.app")) return "preview";
  return "dev";
}

export function isPostHogSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !window.__TAURI_INTERNALS__ &&
    !!import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
  );
}

export function initPostHog(): void {
  if (!isPostHogSupported()) return;

  const env = getEnvironmentType();

  // Only init on prod or preview hosts
  if (env === "dev") return;

  const isProd = env === "prod";
  const isPreview = env === "preview";

  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    // Preview: disable all auto-capture so no events leave the browser
    capture_pageleave: isProd,
    capture_exceptions: isProd,
    autocapture: isProd,
    disable_session_recording: !isProd,
    disable_surveys: isPreview,
    // Preview: disable remote-config-driven extensions that lazy-load scripts
    ...(isPreview ? { capture_dead_clicks: false, capture_performance: false, capture_heatmaps: false } : {}),
    // Preview: belt-and-braces – drop all events so they never reach PostHog
    before_send: (event) => {
      if (isPreview) return null;
      return dropBenignExceptions(scrubUrlProperties(event));
    },
    session_recording: isProd
      ? {
          maskAllInputs: true,
          maskTextSelector: "[data-ph-mask], .ph-mask",
          maskCapturedNetworkRequestFn: (request) => {
            if (typeof request.name === "string") {
              request.name = scrubSensitiveUrl(request.name);
            }
            return request;
          },
        }
      : undefined,
  });

  // Register environment as a super property so all events include it
  posthog.register({ env });
}

export function capturePostHogPageview(): void {
  if (!isPostHogSupported()) return;

  const env = getEnvironmentType();
  // Only capture events on prod
  if (env !== "prod") return;

  posthog.capture("$pageview", {
    $current_url: scrubSensitiveUrl(window.location.href),
  });
}

export function capturePostHogEvent(
  event: string,
  properties: PostHogEventProperties = {}
): void {
  if (!isPostHogSupported()) return;

  const env = getEnvironmentType();
  // Only capture events on prod
  if (env !== "prod") return;

  posthog.capture(event, {
    platform: "web",
    ...properties,
  });
}

type PostHogPersonTraits = {
  name?: string;
  email?: string;
};

export function identifyPostHogUser(
  user: User,
  language: string,
  person: PostHogPersonTraits = {}
): void {
  if (!isPostHogSupported()) return;

  const env = getEnvironmentType();
  // Only init on prod or preview hosts
  if (env === "dev") return;

  const setProps: Record<string, string> = { language };
  if (person.name) setProps.name = person.name;
  if (person.email) setProps.email = person.email;

  // On preview, identify() sets person properties for flag evaluation;
  // the $identify event is dropped by before_send
  posthog.identify(
    user.id,
    setProps,
    { first_login_at: new Date().toISOString() }
  );
}

export function resetPostHogUser(): void {
  if (!isPostHogSupported()) return;

  const env = getEnvironmentType();
  // Only init on prod or preview hosts
  if (env === "dev") return;

  posthog.reset();
}
