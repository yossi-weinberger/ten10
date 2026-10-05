import { maskEmail } from "../_shared/email-guard.ts";
import type { EmailResult } from "./simple-email-service.ts";

export type PublicReminderSendResult = {
  email: string;
  status: "sent" | "failed" | "held";
  dryRun?: boolean;
  messageId?: string;
};

export type ReminderSendSummary = {
  emails_sent: number;
  emails_held: number;
  emails_failed: number;
  results: PublicReminderSendResult[];
};

function publicStatus(result: EmailResult): "sent" | "failed" | "held" {
  if (result.status === "failed") {
    return "failed";
  }
  if (result.status === "held" || result.dryRun === true) {
    return "held";
  }
  return "sent";
}

export function summarizeReminderSendResults(
  results: readonly EmailResult[],
): ReminderSendSummary {
  const publicResults = results.map((result) => {
    const status = publicStatus(result);
    const entry: PublicReminderSendResult = {
      email: maskEmail(result.email),
      status,
    };
    if (status === "held") {
      entry.dryRun = true;
    }
    if (result.messageId) {
      entry.messageId = result.messageId;
    }
    return entry;
  });

  return {
    emails_sent: publicResults.filter((result) => result.status === "sent").length,
    emails_held: publicResults.filter((result) => result.status === "held").length,
    emails_failed: publicResults.filter((result) => result.status === "failed")
      .length,
    results: publicResults,
  };
}
