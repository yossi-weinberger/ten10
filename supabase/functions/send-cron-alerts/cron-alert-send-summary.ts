import { maskEmail } from "../_shared/email-guard.ts";
import type { RawEmailSendResult } from "../_shared/simple-email-service.ts";

export type CronAlertSendAttempt = {
  email: string;
  result?: RawEmailSendResult;
  error?: string;
};

export type PublicCronAlertSendResult = {
  email: string;
  status: "sent" | "failed" | "held";
  dryRun?: boolean;
  messageId?: string;
  error?: string;
};

export type CronAlertSendSummary = {
  emailsSent: number;
  emailsHeld: number;
  emailsFailed: number;
  results: PublicCronAlertSendResult[];
};

function publicStatus(
  attempt: CronAlertSendAttempt,
): "sent" | "failed" | "held" {
  if (attempt.error !== undefined) {
    return "failed";
  }
  if (attempt.result?.dryRun === true) {
    return "held";
  }
  return "sent";
}

export function summarizeCronAlertSendResults(
  attempts: readonly CronAlertSendAttempt[],
): CronAlertSendSummary {
  const results = attempts.map((attempt) => {
    const status = publicStatus(attempt);
    const entry: PublicCronAlertSendResult = {
      email: maskEmail(attempt.email),
      status,
    };
    if (status === "held") {
      entry.dryRun = true;
    }
    if (attempt.result?.MessageId) {
      entry.messageId = attempt.result.MessageId;
    }
    if (status === "failed" && attempt.error !== undefined) {
      entry.error = attempt.error;
    }
    return entry;
  });

  return {
    emailsSent: results.filter((result) => result.status === "sent").length,
    emailsHeld: results.filter((result) => result.status === "held").length,
    emailsFailed: results.filter((result) => result.status === "failed").length,
    results,
  };
}
