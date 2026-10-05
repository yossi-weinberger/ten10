import { describe, expect, it } from "vitest";
import { summarizeReminderSendResults } from "./reminder-send-summary.ts";
import type { EmailResult } from "./simple-email-service.ts";

const sent: EmailResult = {
  userId: "user-1",
  email: "alice@gmail.com",
  titheBalance: 10,
  messageId: "ses-1",
  status: "sent",
};

const held: EmailResult = {
  userId: "user-2",
  email: "bob@ten10-app.com",
  titheBalance: 20,
  messageId: "dry-run",
  status: "held",
  dryRun: true,
};

const failed: EmailResult = {
  userId: "user-3",
  email: "cara@example.com",
  titheBalance: 30,
  status: "failed",
  error: "SES V2 error",
};

describe("summarizeReminderSendResults", () => {
  it("counts held separately from sent and returns masked emails only", () => {
    const summary = summarizeReminderSendResults([sent, held, failed]);

    expect(summary.emails_sent).toBe(1);
    expect(summary.emails_held).toBe(1);
    expect(summary.emails_failed).toBe(1);
    expect(summary.results).toEqual([
      { email: "a***@gmail.com", status: "sent", messageId: "ses-1" },
      {
        email: "b***@ten10-app.com",
        status: "held",
        dryRun: true,
        messageId: "dry-run",
      },
      { email: "c***@example.com", status: "failed" },
    ]);
    expect(JSON.stringify(summary)).not.toContain("alice@gmail.com");
    expect(JSON.stringify(summary)).not.toContain("bob@ten10-app.com");
    expect(JSON.stringify(summary)).not.toContain("cara@example.com");
  });

  it("treats a legacy sent+dryRun result as held", () => {
    const summary = summarizeReminderSendResults([
      {
        ...held,
        status: "sent",
      },
    ]);

    expect(summary.emails_sent).toBe(0);
    expect(summary.emails_held).toBe(1);
    expect(summary.results[0]?.status).toBe("held");
  });
});
