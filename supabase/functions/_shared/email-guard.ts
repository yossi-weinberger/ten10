/**
 * Fail-safe guard for every Edge Function SES send.
 *
 * Production is detected from SUPABASE_URL (host must contain the production
 * ref) or EMAIL_ENV=production. On any other environment, sending is blocked
 * unless DRY_RUN=true (log only) or EMAIL_ALLOWLIST is a non-empty list.
 */

export const PRODUCTION_SUPABASE_REF = "flpzqbvbymoluoeeeofg";

export type EmailGuardEnv = {
  get(name: string): string | undefined;
};

export type EmailGuardHoldReason = "dry-run" | "fail-safe" | "allowlist-empty";

export type EmailGuardDecision =
  | {
      action: "send";
      recipients: string[];
      droppedCount: number;
      dryRun: false;
      isProduction: boolean;
    }
  | {
      action: "hold";
      reason: EmailGuardHoldReason;
      recipients: string[];
      droppedCount: number;
      dryRun: true;
      isProduction: boolean;
    };

export type GuardEmailSendInput = {
  recipients: string[];
  subject: string;
  functionName: string;
  env?: EmailGuardEnv;
};

export type DryRunEmailResult = {
  MessageId: "dry-run";
  dryRun: true;
};

type DenoEnvReader = {
  env?: {
    get?: (name: string) => string | undefined;
  };
};

function defaultEnv(): EmailGuardEnv {
  const deno = (globalThis as { Deno?: DenoEnvReader }).Deno;
  return {
    get(name: string) {
      return deno?.env?.get?.(name);
    },
  };
}

function readEnv(name: string, env?: EmailGuardEnv): string | undefined {
  return (env ?? defaultEnv()).get(name);
}

export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    return "***";
  }
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const first = local.charAt(0) || "*";
  return `${first}***@${domain}`;
}

export function isProductionEmailEnv(env?: EmailGuardEnv): boolean {
  const override = readEnv("EMAIL_ENV", env)?.trim().toLowerCase();
  if (override === "production") {
    return true;
  }
  if (override) {
    return false;
  }
  const supabaseUrl = readEnv("SUPABASE_URL", env) ?? "";
  return supabaseUrl.includes(PRODUCTION_SUPABASE_REF);
}

export function parseEmailAllowlist(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isDryRunEnabled(env?: EmailGuardEnv): boolean {
  return readEnv("DRY_RUN", env)?.trim().toLowerCase() === "true";
}

function holdReasonLabel(reason: EmailGuardHoldReason): string {
  switch (reason) {
    case "dry-run":
      return "DRY_RUN=true";
    case "fail-safe":
      return "non-production fail-safe";
    case "allowlist-empty":
      return "allowlist filtered all recipients";
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

function logHold(
  decision: Extract<EmailGuardDecision, { action: "hold" }>,
  subject: string,
  functionName: string,
): void {
  const summary = {
    function: functionName,
    reason: holdReasonLabel(decision.reason),
    recipientCount: decision.recipients.length,
    maskedRecipients: decision.recipients.map(maskEmail),
    subject,
    droppedCount: decision.droppedCount,
    dryRun: true,
  };
  if (decision.reason === "fail-safe") {
    console.warn(
      "[EMAIL_GUARD] Non-production send blocked because neither DRY_RUN=true nor EMAIL_ALLOWLIST is set",
      summary,
    );
    return;
  }
  console.log("[EMAIL_GUARD] Held email send", summary);
}

export function dryRunEmailResult(): DryRunEmailResult {
  return { MessageId: "dry-run", dryRun: true };
}

export function guardEmailSend(input: GuardEmailSendInput): EmailGuardDecision {
  const env = input.env;
  const recipients = input.recipients
    .map((recipient) => recipient.trim())
    .filter((recipient) => recipient.length > 0);
  const isProduction = isProductionEmailEnv(env);
  const dryRun = isDryRunEnabled(env);
  const allowlist = parseEmailAllowlist(readEnv("EMAIL_ALLOWLIST", env));
  const hasAllowlist = allowlist.length > 0;
  const failSafe = !isProduction && !dryRun && !hasAllowlist;

  const allowed = hasAllowlist
    ? recipients.filter((recipient) =>
        allowlist.includes(recipient.toLowerCase()),
      )
    : recipients;
  const droppedCount = recipients.length - allowed.length;

  if (hasAllowlist && droppedCount > 0) {
    console.log("[EMAIL_GUARD] Allowlist dropped recipients", {
      function: input.functionName,
      droppedCount,
      remainingCount: allowed.length,
    });
  }

  if (failSafe) {
    const decision: EmailGuardDecision = {
      action: "hold",
      reason: "fail-safe",
      recipients: allowed,
      droppedCount,
      dryRun: true,
      isProduction,
    };
    logHold(decision, input.subject, input.functionName);
    return decision;
  }

  if (allowed.length === 0) {
    const decision: EmailGuardDecision = {
      action: "hold",
      reason: "allowlist-empty",
      recipients: [],
      droppedCount,
      dryRun: true,
      isProduction,
    };
    logHold(decision, input.subject, input.functionName);
    return decision;
  }

  if (dryRun) {
    const decision: EmailGuardDecision = {
      action: "hold",
      reason: "dry-run",
      recipients: allowed,
      droppedCount,
      dryRun: true,
      isProduction,
    };
    logHold(decision, input.subject, input.functionName);
    return decision;
  }

  return {
    action: "send",
    recipients: allowed,
    droppedCount,
    dryRun: false,
    isProduction,
  };
}
