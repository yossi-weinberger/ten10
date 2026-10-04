import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PRODUCTION_SUPABASE_REF,
  dryRunEmailResult,
  guardEmailSend,
  isDryRunEnabled,
  isProductionEmailEnv,
  maskEmail,
  parseEmailAllowlist,
  type EmailGuardEnv,
} from "./email-guard.ts";

const TESTING_URL = "https://bbcllewcotypedqsnwmi.supabase.co";
const PRODUCTION_URL = `https://${PRODUCTION_SUPABASE_REF}.supabase.co`;

function env(values: Record<string, string | undefined>): EmailGuardEnv {
  return {
    get(name: string) {
      return values[name];
    },
  };
}

describe("maskEmail", () => {
  it("masks the local part after the first character", () => {
    expect(maskEmail("alice@gmail.com")).toBe("a***@gmail.com");
    expect(maskEmail("A***@Example.com")).toBe("A***@Example.com");
  });

  it("masks invalid addresses without leaking the raw value", () => {
    expect(maskEmail("not-an-email")).toBe("***");
    expect(maskEmail("@missing-local.com")).toBe("***");
  });
});

describe("parseEmailAllowlist", () => {
  it("trims, lowercases, and drops empty entries", () => {
    expect(parseEmailAllowlist(" Alice@Gmail.com , , bob@ten10-app.com ")).toEqual(
      ["alice@gmail.com", "bob@ten10-app.com"],
    );
  });

  it("treats blank values as unset", () => {
    expect(parseEmailAllowlist(undefined)).toEqual([]);
    expect(parseEmailAllowlist("")).toEqual([]);
    expect(parseEmailAllowlist(" , , ")).toEqual([]);
  });
});

describe("isProductionEmailEnv", () => {
  it("treats the production Supabase ref as production", () => {
    expect(isProductionEmailEnv(env({ SUPABASE_URL: PRODUCTION_URL }))).toBe(
      true,
    );
  });

  it("treats the testing ref as non-production", () => {
    expect(isProductionEmailEnv(env({ SUPABASE_URL: TESTING_URL }))).toBe(
      false,
    );
  });

  it("allows EMAIL_ENV=production to override a testing URL", () => {
    expect(
      isProductionEmailEnv(
        env({ SUPABASE_URL: TESTING_URL, EMAIL_ENV: " Production " }),
      ),
    ).toBe(true);
  });

  it("treats any other EMAIL_ENV as non-production even on the prod URL", () => {
    expect(
      isProductionEmailEnv(
        env({ SUPABASE_URL: PRODUCTION_URL, EMAIL_ENV: "testing" }),
      ),
    ).toBe(false);
  });
});

describe("guardEmailSend", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("holds and marks dry-run when DRY_RUN=true", () => {
    const decision = guardEmailSend({
      recipients: ["alice@gmail.com", "bob@ten10-app.com"],
      subject: "Monthly reminder",
      functionName: "send-reminder-emails",
      env: env({
        SUPABASE_URL: PRODUCTION_URL,
        DRY_RUN: "true",
      }),
    });

    expect(decision).toEqual({
      action: "hold",
      reason: "dry-run",
      recipients: ["alice@gmail.com", "bob@ten10-app.com"],
      droppedCount: 0,
      dryRun: true,
      isProduction: true,
    });
    expect(console.log).toHaveBeenCalledWith(
      "[EMAIL_GUARD] Held email send",
      expect.objectContaining({
        function: "send-reminder-emails",
        recipientCount: 2,
        maskedRecipients: ["a***@gmail.com", "b***@ten10-app.com"],
        subject: "Monthly reminder",
        dryRun: true,
      }),
    );
  });

  it("filters the allowlist case-insensitively and logs only the dropped count", () => {
    const decision = guardEmailSend({
      recipients: ["Alice@Gmail.com", "blocked@example.com"],
      subject: "Contact form",
      functionName: "send-contact-email",
      env: env({
        SUPABASE_URL: TESTING_URL,
        EMAIL_ALLOWLIST: "alice@gmail.com",
      }),
    });

    expect(decision).toEqual({
      action: "send",
      recipients: ["Alice@Gmail.com"],
      droppedCount: 1,
      dryRun: false,
      isProduction: false,
    });
    expect(console.log).toHaveBeenCalledWith(
      "[EMAIL_GUARD] Allowlist dropped recipients",
      {
        function: "send-contact-email",
        droppedCount: 1,
        remainingCount: 1,
      },
    );
    expect(JSON.stringify(vi.mocked(console.log).mock.calls)).not.toContain(
      "blocked@example.com",
    );
  });

  it("sends nothing when the allowlist drops every recipient", () => {
    const decision = guardEmailSend({
      recipients: ["alice@gmail.com"],
      subject: "Download link",
      functionName: "process-email-request",
      env: env({
        SUPABASE_URL: TESTING_URL,
        EMAIL_ALLOWLIST: "tester@ten10-app.com",
      }),
    });

    expect(decision.action).toBe("hold");
    if (decision.action !== "hold") {
      throw new Error("expected hold");
    }
    expect(decision.reason).toBe("allowlist-empty");
    expect(decision.recipients).toEqual([]);
    expect(decision.dryRun).toBe(true);
    expect(isDryRunEnabled(env({ DRY_RUN: "true" }))).toBe(true);
  });

  it("fail-safes non-production when neither DRY_RUN nor EMAIL_ALLOWLIST is set", () => {
    const decision = guardEmailSend({
      recipients: ["user@example.com"],
      subject: "Maaser year close",
      functionName: "send-reminder-emails",
      env: env({ SUPABASE_URL: TESTING_URL }),
    });

    expect(decision).toMatchObject({
      action: "hold",
      reason: "fail-safe",
      dryRun: true,
      isProduction: false,
    });
    expect(console.warn).toHaveBeenCalledWith(
      "[EMAIL_GUARD] Non-production send blocked because neither DRY_RUN=true nor EMAIL_ALLOWLIST is set",
      expect.objectContaining({
        function: "send-reminder-emails",
        maskedRecipients: ["u***@example.com"],
        subject: "Maaser year close",
      }),
    );
  });

  it("leaves production unchanged when neither DRY_RUN nor EMAIL_ALLOWLIST is set", () => {
    const decision = guardEmailSend({
      recipients: ["user@example.com"],
      subject: "Daily summary",
      functionName: "send-new-user-email",
      env: env({ SUPABASE_URL: PRODUCTION_URL }),
    });

    expect(decision).toEqual({
      action: "send",
      recipients: ["user@example.com"],
      droppedCount: 0,
      dryRun: false,
      isProduction: true,
    });
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it("has no test-mode or force-send bypass", () => {
    const decision = guardEmailSend({
      recipients: ["user@example.com"],
      subject: "Forced test send",
      functionName: "send-reminder-emails",
      env: env({
        SUPABASE_URL: TESTING_URL,
        // Callers may set body.test === true; that flag never reaches the guard.
        TEST: "true",
      }),
    });

    expect(decision.action).toBe("hold");
    if (decision.action !== "hold") {
      throw new Error("expected hold");
    }
    expect(decision.reason).toBe("fail-safe");
    expect(dryRunEmailResult()).toEqual({ MessageId: "dry-run", dryRun: true });
  });
});
