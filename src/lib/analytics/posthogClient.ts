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
    session_recording: {
      maskAllInputs: true,
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

export function identifyPostHogUser(user: User, language: string): void {
  if (!isPostHogSupported()) return;

  posthog.identify(
    user.id,
    { language },
    { first_login_at: new Date().toISOString() }
  );
}

export function resetPostHogUser(): void {
  if (!isPostHogSupported()) return;

  posthog.reset();
}
