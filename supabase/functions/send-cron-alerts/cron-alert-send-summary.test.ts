import { describe, expect, it } from "vitest";
import { summarizeCronAlertSendResults } from "./cron-alert-send-summary.ts";

describe("summarizeCronAlertSendResults", () => {
  it("counts held guard/dry-run results separately from sent", () => {
    const summary = summarizeCronAlertSendResults([
      {
        email: "ops@ten10-app.com",
        result: { MessageId: "ses-1" },
      },
      {
        email: "alerts@ten10-app.com",
        result: { MessageId: "dry-run", dryRun: true },
      },
      {
        email: "oncall@ten10-app.com",
        error: "SES V2 error: 400",
      },
    ]);

    expect(summary.emailsSent).toBe(1);
    expect(summary.emailsHeld).toBe(1);
    expect(summary.emailsFailed).toBe(1);
    expect(summary.results).toEqual([
      {
        email: "o***@ten10-app.com",
        status: "sent",
        messageId: "ses-1",
      },
      {
        email: "a***@ten10-app.com",
        status: "held",
        dryRun: true,
        messageId: "dry-run",
      },
      {
        email: "o***@ten10-app.com",
        status: "failed",
        error: "SES V2 error: 400",
      },
    ]);
  });
});
