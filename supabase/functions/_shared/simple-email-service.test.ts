import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCTION_SUPABASE_REF } from "./email-guard.ts";
import { SimpleEmailService } from "./simple-email-service.ts";

const PRODUCTION_URL = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`;
const TESTING_URL = "https://bbcllewcotypedqsnwmi.supabase.co";

function stubDeno(values: Record<string, string | undefined>): void {
  vi.stubGlobal("Deno", {
    env: {
      get: (key: string) => values[key],
    },
  });
}

const awsEnv = {
  AWS_ACCESS_KEY_ID: "test-access-key",
  AWS_SECRET_ACCESS_KEY: "test-secret-key",
  AWS_REGION: "eu-central-1",
  SES_FROM: "contact-form@ten10-app.com",
};

describe("shared SimpleEmailService email guard", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("sends on production when no guard env vars are set", async () => {
    stubDeno({
      ...awsEnv,
      SUPABASE_URL: PRODUCTION_URL,
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ MessageId: "message-123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const service = new SimpleEmailService(undefined, "send-cron-alerts");
    const result = await service.sendRawEmail({
      to: "dev@ten10-app.com",
      cc: "halacha@ten10-app.com",
      subject: "Cron failure",
      textBody: "plain",
      htmlBody: "<p>html</p>",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toEqual({ MessageId: "message-123" });
  });

  it("does not send on DRY_RUN and returns a success-shaped dryRun result", async () => {
    stubDeno({
      ...awsEnv,
      SUPABASE_URL: PRODUCTION_URL,
      DRY_RUN: "true",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = new SimpleEmailService(undefined, "send-new-user-email");
    const result = await service.sendRawEmail({
      to: "dev@ten10-app.com",
      subject: "Daily summary",
      textBody: "plain",
      htmlBody: "<p>html</p>",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ MessageId: "dry-run", dryRun: true });
  });

  it("drops a non-allowlisted To address and does not send to remaining CC", async () => {
    stubDeno({
      ...awsEnv,
      SUPABASE_URL: TESTING_URL,
      EMAIL_ALLOWLIST: "halacha@ten10-app.com",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = new SimpleEmailService(
      "contact-form@ten10-app.com",
      "send-contact-email",
    );
    const result = await service.sendRawEmail({
      to: "dev@ten10-app.com",
      cc: "halacha@ten10-app.com",
      subject: "Contact form",
      textBody: "plain",
      htmlBody: "<p>html</p>",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ MessageId: "dry-run", dryRun: true });
  });

  it("holds without AWS credentials when the guard blocks the send", async () => {
    stubDeno({
      SUPABASE_URL: TESTING_URL,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const service = new SimpleEmailService(undefined, "send-contact-email");
    const result = await service.sendRawEmail({
      to: "dev@ten10-app.com",
      subject: "Contact form",
      textBody: "plain",
      htmlBody: "<p>html</p>",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ MessageId: "dry-run", dryRun: true });
  });

  it("still requires AWS credentials for a real production send", async () => {
    stubDeno({
      SUPABASE_URL: PRODUCTION_URL,
    });

    const service = new SimpleEmailService(undefined, "send-cron-alerts");
    await expect(
      service.sendRawEmail({
        to: "dev@ten10-app.com",
        subject: "Cron failure",
        textBody: "plain",
        htmlBody: "<p>html</p>",
      }),
    ).rejects.toThrow("Missing AWS credentials.");
  });
});
