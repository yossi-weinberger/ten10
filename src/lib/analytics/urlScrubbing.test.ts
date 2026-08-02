import { describe, it, expect } from "vitest";
import { scrubSensitiveUrl } from "./urlScrubbing";

describe("scrubSensitiveUrl", () => {
  it("redacts access and refresh tokens from a Supabase OAuth callback fragment", () => {
    const url =
      "https://ten10-app.com/#access_token=eyJhbGciOi.SECRET.abc&expires_at=1753900000&expires_in=3600&refresh_token=r3fr3sh-secret&token_type=bearer";
    const scrubbed = scrubSensitiveUrl(url);

    expect(scrubbed).not.toContain("eyJhbGciOi.SECRET.abc");
    expect(scrubbed).not.toContain("r3fr3sh-secret");
    expect(scrubbed).toContain("access_token=[REDACTED]");
    expect(scrubbed).toContain("refresh_token=[REDACTED]");
    // Non-sensitive fragment params are preserved.
    expect(scrubbed).toContain("expires_at=1753900000");
    expect(scrubbed).toContain("token_type=bearer");
  });

  it("redacts provider tokens carried alongside the session", () => {
    const url =
      "https://ten10-app.com/#provider_token=ya29.google-secret&provider_refresh_token=1//refresh-secret&access_token=a";
    const scrubbed = scrubSensitiveUrl(url);

    expect(scrubbed).not.toContain("ya29.google-secret");
    expect(scrubbed).not.toContain("1//refresh-secret");
    expect(scrubbed).toContain("provider_token=[REDACTED]");
    expect(scrubbed).toContain("provider_refresh_token=[REDACTED]");
  });

  it("redacts sensitive params in the query string (PKCE code, magic-link token)", () => {
    expect(scrubSensitiveUrl("https://ten10-app.com/reset-password?code=one-time-code")).toBe(
      "https://ten10-app.com/reset-password?code=[REDACTED]"
    );
    expect(scrubSensitiveUrl("https://ten10-app.com/?token=magiclink&email=a@b.com")).toBe(
      "https://ten10-app.com/?token=[REDACTED]&email=[REDACTED]"
    );
  });

  it("leaves URLs without sensitive parameters untouched", () => {
    const url = "https://ten10-app.com/dashboard?tab=transactions&sort=date#section-2";
    expect(scrubSensitiveUrl(url)).toBe(url);
  });

  it("matches parameter names case-insensitively", () => {
    expect(scrubSensitiveUrl("https://ten10-app.com/#Access_Token=x")).toBe(
      "https://ten10-app.com/#Access_Token=[REDACTED]"
    );
  });

  it("does not partial-match a longer, unrelated parameter name", () => {
    const url = "https://ten10-app.com/?my_code_ref=keepme";
    expect(scrubSensitiveUrl(url)).toBe(url);
  });

  it("returns an empty string for nullish or non-string input", () => {
    expect(scrubSensitiveUrl(null)).toBe("");
    expect(scrubSensitiveUrl(undefined)).toBe("");
    expect(scrubSensitiveUrl("")).toBe("");
  });
});
