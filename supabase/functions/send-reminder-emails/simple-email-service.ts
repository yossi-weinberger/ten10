import {
  dryRunEmailResult,
  guardEmailSend,
  maskEmail,
} from "../_shared/email-guard.ts";
import {
  generateReminderEmailHTML,
  generateReminderEmailSubject,
  generateReminderEmailText,
  EmailTemplateData,
} from "./email-templates.ts";
import {
  getIsraelMonth,
  ReminderLanguage,
} from "./email-copy.ts";
import { generateUnsubscribeUrls } from "./jwt-utils.ts";
import {
  base64Encode,
  createSesAuthorization,
  foldBase64,
  getAmzDate,
  sha256Hex,
} from "../_shared/ses-v4.ts";

/**
 * Simple Email Service (SES v2 HTTP JSON) for Deno Edge — Raw MIME support
 * - Supports List-Unsubscribe / List-Unsubscribe-Post via Raw MIME
 * - Correct SigV4: service=ses, host=email.<region>.amazonaws.com
 * - Single X-Amz-Date for both header and signature
 * - Optional Configuration Set via SES_CONFIGURATION_SET
 * - Tags with user_id_hash (SHA-256 short) instead of raw user_id
 */

export interface EmailResult {
  userId: string;
  email: string;
  titheBalance: number;
  messageId?: string;
  status: "sent" | "failed" | "held";
  error?: string;
  dryRun?: boolean;
}

export class SimpleEmailService {
  private awsAccessKeyId: string;
  private awsSecretAccessKey: string;
  private awsRegion: string;
  private fromEmail: string;
  private fromName: string | undefined;
  private configurationSet?: string;
  private mailtoUnsub?: string; // optional: e.g. "unsubscribe@ten10-app.com"
  private listHelpUrl?: string; // optional help page

  constructor() {
    this.awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") ?? "";
    this.awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "";
    this.awsRegion = Deno.env.get("AWS_REGION") ?? "eu-central-1";
    this.fromEmail =
      Deno.env.get("SES_FROM") ?? "reminder-noreply@ten10-app.com";
    this.fromName = Deno.env.get("SES_FROM_NAME") ?? undefined; // e.g. "Ten10 Reminders"
    this.configurationSet = Deno.env.get("SES_CONFIGURATION_SET") ?? undefined;
    this.mailtoUnsub = Deno.env.get("MAILTO_UNSUB") ?? undefined; // optional
    this.listHelpUrl = Deno.env.get("UNSUB_HELP_URL") ?? undefined; // optional

    console.log("[EMAIL_SERVICE] Initializing with config:", {
      awsRegion: this.awsRegion,
      fromEmail: this.fromEmail,
      hasAccessKey: !!this.awsAccessKeyId,
      hasSecretKey: !!this.awsSecretAccessKey,
      hasFromEmail: !!this.fromEmail,
    });
  }

  private assertCanSend(): void {
    if (!this.awsAccessKeyId || !this.awsSecretAccessKey) {
      const error = "Missing AWS credentials (AWS_ACCESS_KEY_ID/SECRET).";
      console.error("[EMAIL_SERVICE]", error);
      throw new Error(error);
    }
    if (!this.fromEmail) {
      const error = "Missing SES_FROM sender address.";
      console.error("[EMAIL_SERVICE]", error);
      throw new Error(error);
    }
  }

  // ---------------- Public API ----------------

  async sendReminderEmail(
    userEmail: string,
    userId: string,
    titheBalance: number,
    maaserBalance: number | undefined,
    chomeshBalance: number | undefined,
    language: ReminderLanguage,
    fullName: string | null,
    currency?: string | null,
    kind: "monthly" | "maaser-year" = "monthly",
  ): Promise<EmailResult> {
    try {
      const maskedEmail = maskEmail(userEmail);
      console.log(`[EMAIL] Starting to send reminder email to ${maskedEmail}`);

      const templateData: EmailTemplateData = {
        titheBalance,
        maaserBalance,
        chomeshBalance,
        language,
        fullName,
        currency,
        israelMonth: getIsraelMonth(),
        kind,
        unsubscribeUrls: { reminderUrl: "", allUrl: "" },
      };
      const subject = generateReminderEmailSubject(templateData);

      const decision = guardEmailSend({
        recipients: [userEmail],
        subject,
        functionName: "send-reminder-emails",
      });
      if (decision.action === "hold") {
        const held = dryRunEmailResult();
        return {
          userId,
          email: userEmail,
          titheBalance,
          messageId: held.MessageId,
          status: "held",
          dryRun: true,
        };
      }

      this.assertCanSend();

      // 1) Build template data
      let unsubscribeUrls;
      try {
        unsubscribeUrls = await generateUnsubscribeUrls(userId, userEmail);
        console.log(`[EMAIL] Generated unsubscribe URLs for ${maskedEmail}`);
      } catch (error) {
        console.error(
          `[EMAIL] Failed to generate unsubscribe URLs for ${maskedEmail}:`,
          error,
        );
        // Continue without unsubscribe URLs - email can still be sent
        unsubscribeUrls = { reminderUrl: "", allUrl: "" };
      }
      templateData.unsubscribeUrls = unsubscribeUrls;
      const htmlBody = generateReminderEmailHTML(templateData);
      const textBody = generateReminderEmailText(templateData);

      // 2) Build Raw MIME with List-Unsubscribe headers
      const mimeBytes = await this.buildRawMime({
        to: userEmail,
        subject,
        textBody,
        htmlBody,
        unsubscribeUrl: unsubscribeUrls.allUrl,
      });

      // 3) Prepare SES v2 JSON payload with Raw content
      const topLevel: Record<string, unknown> = {
        FromEmailAddress: this.fromEmail,
        Destination: { ToAddresses: [userEmail] },
        Content: {
          Raw: { Data: base64Encode(mimeBytes) },
        },
        EmailTags: await this.buildEmailTagsSafe(userId),
      };

      if (this.configurationSet) {
        topLevel["ConfigurationSetName"] = this.configurationSet;
      }

      const host = `email.${this.awsRegion}.amazonaws.com`;
      const path = "/v2/email/outbound-emails";
      const endpoint = `https://${host}${path}`;
      const amzDate = getAmzDate();
      const bodyStr = JSON.stringify(topLevel);

      const authorization = await createSesAuthorization({
        accessKeyId: this.awsAccessKeyId,
        secretAccessKey: this.awsSecretAccessKey,
        region: this.awsRegion,
        method: "POST",
        host,
        path,
        amzDate,
        contentType: "application/json",
        bodyStr,
      });

      // 5) Send
      console.log(`[EMAIL] Sending email to ${maskedEmail} via AWS SES...`);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Amz-Date": amzDate,
          Authorization: authorization,
        },
        body: bodyStr,
      });

      if (!res.ok) {
        const t = await res.text();
        const errorMsg = `SES V2 error: ${res.status} ${t}`;
        console.error(`[EMAIL] AWS SES error for ${maskedEmail}:`, errorMsg);
        throw new Error(errorMsg);
      }

      const json = (await res.json()) as { MessageId?: string };
      console.log(
        `[EMAIL] Successfully sent email to ${maskedEmail}, MessageId: ${json?.MessageId}`,
      );
      return {
        userId,
        email: userEmail,
        titheBalance,
        messageId: json?.MessageId,
        status: "sent",
      };
    } catch (error: any) {
      console.error(`Error sending email to ${maskEmail(userEmail)}:`, error);
      return {
        userId,
        email: userEmail,
        titheBalance,
        status: "failed",
        error: String(error?.message ?? error),
      };
    }
  }

  async sendBulkReminders(
    users: Array<{
      id: string;
      email: string;
      titheBalance: number;
      maaserBalance?: number;
      chomeshBalance?: number;
      language: ReminderLanguage;
      full_name: string | null;
      default_currency?: string | null;
    }>,
    kind: "monthly" | "maaser-year" = "monthly",
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    // Sequential with a gentle delay; you can replace with a small concurrency pool if needed.
    for (const u of users) {
      const r = await this.sendReminderEmail(
        u.email,
        u.id,
        u.titheBalance,
        u.maaserBalance,
        u.chomeshBalance,
        u.language,
        u.full_name,
        u.default_currency,
        kind,
      );
      results.push(r);
      await this.sleep(100);
    }
    return results;
  }

  // ---------------- MIME builder ----------------

  private async buildRawMime(args: {
    to: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    unsubscribeUrl: string;
  }): Promise<Uint8Array> {
    const { to, subject, textBody, htmlBody, unsubscribeUrl } = args;

    // Display name (optional)
    const fromDisplay = this.fromName
      ? `${this.encodeDisplayName(this.fromName)} <${this.fromEmail}>`
      : this.fromEmail;

    // We include both URL and (optionally) mailto for wider client support.
    const listUnsubParts = [
      `<${unsubscribeUrl}>`,
      ...(this.mailtoUnsub
        ? [`<mailto:${this.mailtoUnsub}?subject=unsubscribe>`]
        : []),
    ];
    const listUnsubscribe = listUnsubParts.join(", ");

    // Optional List-Help
    const listHelp = this.listHelpUrl ? `<${this.listHelpUrl}>` : undefined;

    // MIME boundaries
    const boundary = `=_ten10_${cryptoRandomString(24)}`;

    // Each part will be base64-encoded (safe for UTF-8 content)
    const textBase64 = foldBase64(
      base64Encode(new TextEncoder().encode(textBody)),
    );
    const htmlBase64 = foldBase64(
      base64Encode(new TextEncoder().encode(htmlBody)),
    );

    // Build headers and body with CRLF per RFC 5322
    const headers: string[] = [
      `From: ${fromDisplay}`,
      `To: ${to}`,
      // Use RFC 2047 (encoded-word) for UTF-8 subject
      `Subject: ${this.encodeMimeWord(subject, "utf-8")}`,
      `MIME-Version: 1.0`,
      `List-Unsubscribe: ${listUnsubscribe}`,
      `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
    ];
    if (listHelp) headers.push(`List-Help: ${listHelp}`);

    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    const mime =
      headers.join("\r\n") +
      "\r\n\r\n" +
      `--${boundary}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${textBase64}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: text/html; charset="UTF-8"\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      `${htmlBase64}\r\n` +
      `--${boundary}--\r\n`;

    return new TextEncoder().encode(mime);
  }

  // Encode a display-name safely (simple variant)
  private encodeDisplayName(name: string): string {
    // If pure ASCII without specials, return as is. Else use encoded-word.
    if (/^[\x20-\x7E]+$/.test(name) && !/[",]/.test(name)) return name;
    return this.encodeMimeWord(name, "utf-8");
  }

  // RFC 2047 "encoded-word" for headers like Subject/From name
  private encodeMimeWord(text: string, charset = "utf-8"): string {
    const bytes = new TextEncoder().encode(text);
    const b64 = base64Encode(bytes);
    return `=?${charset}?B?${b64}?=`;
    // (Q-encoding could be used for shorter ASCII-heavy strings; B64 is simpler & safe)
  }

  private async buildEmailTagsSafe(
    userId: string,
  ): Promise<Array<{ Name: string; Value: string }>> {
    const hash = await sha256Hex(userId);
    const short = hash.slice(0, 12);
    return [
      { Name: "app", Value: "ten10" },
      { Name: "type", Value: "reminder" },
      { Name: "user_id_hash", Value: short },
    ];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// ---------------- Small utilities ----------------

function cryptoRandomString(len = 24): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  // URL-safe-ish base32-ish: map to [a-z0-9]
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
