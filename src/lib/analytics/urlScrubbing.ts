import { SUPPORT_FAILED_PATH, SUPPORT_THANKS_PATH } from "@/lib/support-payment";

/**
 * Redacts authentication material from URLs before it reaches PostHog
 * (pageviews, session-recording metadata, and captured network requests).
 *
 * Supabase's OAuth/magic-link implicit flow returns the session in the URL
 * *fragment* — e.g. `#access_token=…&refresh_token=…&provider_token=…` — and
 * the app briefly sits on that callback URL before Supabase strips the hash.
 * PostHog captures `$current_url` for pageviews and on every `$snapshot`, so
 * without scrubbing those tokens are retained as the recording's start URL and
 * become visible to anyone with replay access.
 *
 * We redact by parameter name in both the query string and the fragment, which
 * keeps legitimate routing/anchor data intact while stripping the secrets.
 *
 * Takbull's payment redirect appends the order, the card token, the last four
 * digits and the token expiry onto the thank-you and failure URLs. Those two
 * paths drop the query and the hash entirely.
 */

const SUPPORT_RETURN_PATHS = new Set<string>([SUPPORT_THANKS_PATH, SUPPORT_FAILED_PATH]);

/** Parameter names whose values must never leave the browser in a URL. */
const SENSITIVE_URL_PARAMS = [
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "id_token",
  "token",
  "code",
  "auth",
  "apikey",
  "email",
  "otp",
  "password",
];

const REDACTED = "[REDACTED]";

/**
 * Matches `<delimiter><sensitiveKey>=<value>` in either the query string or the
 * fragment. The delimiter and `key=` are captured so they can be preserved; the
 * value (everything up to the next `&`) is replaced. The global flag lets a
 * single pass redact every occurrence, including back-to-back fragment params.
 */
const SENSITIVE_PARAM_PATTERN = new RegExp(
  `((?:^|[?&#])(?:${SENSITIVE_URL_PARAMS.join("|")})=)[^&]*`,
  "gi"
);

/**
 * Returns `url` with the values of known authentication parameters replaced by
 * `[REDACTED]`, covering both `?query` and `#fragment` positions. Non-string
 * input is returned as an empty string so callers can pass it straight through.
 */
function withoutSupportReturnSecrets(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, "https://ten10-app.com");
  } catch {
    return null;
  }
  const pathname = parsed.pathname.replace(/\/$/, "") || "/";
  if (!SUPPORT_RETURN_PATHS.has(pathname)) return null;
  const absolute = /^[a-z][a-z\d+\-.]*:/i.test(url);
  if (!absolute) return pathname;
  parsed.pathname = pathname;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

export function scrubSensitiveUrl(url: string | null | undefined): string {
  if (typeof url !== "string" || url.length === 0) return "";
  return withoutSupportReturnSecrets(url) ?? url.replace(SENSITIVE_PARAM_PATTERN, `$1${REDACTED}`);
}

/** Drops Takbull's payment query from the address bar before any analytics read it. */
export function stripSupportReturnFromAddressBar(): void {
  if (typeof window === "undefined") return;
  const stripped = withoutSupportReturnSecrets(window.location.href);
  if (!stripped || stripped === window.location.href) return;
  window.history.replaceState(window.history.state, "", stripped);
}
