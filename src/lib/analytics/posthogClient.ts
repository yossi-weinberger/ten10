import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import type { User } from "@supabase/supabase-js";

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
];

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

export function isPostHogSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    !window.__TAURI_INTERNALS__ &&
    !!import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
  );
}

export function initPostHog(): void {
  if (!isPostHogSupported()) return;

  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false,
    capture_pageleave: true,
    capture_exceptions: true,
    before_send: dropBenignExceptions,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "[data-ph-mask], .ph-mask",
      maskCapturedNetworkRequestFn: (request) => {
        if (request.name) {
          request.name = request.name.replace(
            /([?&](token|access_token|refresh_token|code|auth|email|apikey)=)[^&]+/gi,
            "$1[REDACTED]"
          );
        }
        return request;
      },
    },
  });
}

export function capturePostHogPageview(): void {
  if (!isPostHogSupported()) return;

  posthog.capture("$pageview", {
    $current_url: window.location.href,
  });
}

export function capturePostHogEvent(
  event: string,
  properties: PostHogEventProperties = {}
): void {
  if (!isPostHogSupported()) return;

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

  const setProps: Record<string, string> = { language };
  if (person.name) setProps.name = person.name;
  if (person.email) setProps.email = person.email;

  posthog.identify(
    user.id,
    setProps,
    { first_login_at: new Date().toISOString() }
  );
}

export function resetPostHogUser(): void {
  if (!isPostHogSupported()) return;

  posthog.reset();
}
