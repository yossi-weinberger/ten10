import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";

type PostHogEventProperties = Record<
  string,
  string | number | boolean | null | undefined
>;

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

export function capturePostHogException(
  error: unknown,
  properties: PostHogEventProperties = {}
): void {
  if (!isPostHogSupported()) return;

  const normalized =
    error instanceof Error ? error : new Error(String(error));
  posthog.captureException(normalized, {
    platform: "web",
    ...properties,
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
