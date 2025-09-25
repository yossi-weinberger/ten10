/**
 * Simple Email Service (SES v2 HTTP JSON) for Deno Edge — Raw MIME support
 * - Supports List-Unsubscribe / List-Unsubscribe-Post via Raw MIME
 * - Correct SigV4: service=ses, host=email.<region>.amazonaws.com
 * - Single X-Amz-Date for both header and signature
 * - Optional Configuration Set via SES_CONFIGURATION_SET
 * - Tags with user_id_hash (SHA-256 short) instead of raw user_id
 */

import {
  generateReminderEmailHTML,
  generateReminderEmailSubject,
  EmailTemplateData,
} from "./email-templates.ts";
import { generateUnsubscribeUrls } from "./jwt-utils.ts";

export interface EmailResult {
  userId: string;
  email: string;
  titheBalance: number;
  messageId?: string;
  status: "sent" | "failed";
  error?: string;
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

    if (!this.awsAccessKeyId || !this.awsSecretAccessKey) {
      throw new Error("Missing AWS credentials (AWS_ACCESS_KEY_ID/SECRET).");
    }
    if (!this.fromEmail) {
      throw new Error("Missing SES_FROM sender address.");
    }
  }

  // ---------------- Public API ----------------

  async sendReminderEmail(
    userEmail: string,
    userId: string,
    titheBalance: number
  ): Promise<EmailResult> {
    try {
      // 1) Build template data
      const unsubscribeUrls = await generateUnsubscribeUrls(userId, userEmail);
      const templateData: EmailTemplateData = {
        titheBalance,
        isPositive: titheBalance > 0,
        isNegative: titheBalance < 0,
        unsubscribeUrls,
      };
      const subject = generateReminderEmailSubject(templateData);
      const htmlBody = generateReminderEmailHTML(templateData);
      const textBody =
        `Monthly reminder\n\n` +
        `Balance: ${titheBalance}\n\n` +
        `Unsubscribe (one-click): ${unsubscribeUrls.allUrl}\n`;

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
          Raw: { Data: this.base64Encode(mimeBytes) },
        },
        EmailTags: await this.buildEmailTagsSafe(userId),
      };

      if (this.configurationSet) {
        topLevel["ConfigurationSetName"] = this.configurationSet;
      }

      const host = `email.${this.awsRegion}.amazonaws.com`;
      const path = "/v2/email/outbound-emails";
      const endpoint = `https://${host}${path}`;
      const amzDate = this.getAmzDate();
      const bodyStr = JSON.stringify(topLevel);

      // 4) SigV4 Authorization
      const authorization = await this.createSigV4({
        method: "POST",
        host,
        path,
        amzDate,
        contentType: "application/json",
        bodyStr,
      });

      // 5) Send
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
        throw new Error(`SES V2 error: ${res.status} ${t}`);
      }

      const json = (await res.json()) as { MessageId?: string };
      return {
        userId,
        email: userEmail,
        titheBalance,
        messageId: json?.MessageId,
        status: "sent",
      };
    } catch (error: any) {
      console.error(`Error sending email to ${userEmail}:`, error);
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
    users: Array<{ id: string; email: string; titheBalance: number }>
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    // Sequential with a gentle delay; you can replace with a small concurrency pool if needed.
    for (const u of users) {
      const r = await this.sendReminderEmail(u.email, u.id, u.titheBalance);
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
    const textBase64 = this.base64Encode(new TextEncoder().encode(textBody));
    const htmlBase64 = this.base64Encode(new TextEncoder().encode(htmlBody));

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
    const b64 = this.base64Encode(bytes);
    return `=?${charset}?B?${b64}?=`;
    // (Q-encoding could be used for shorter ASCII-heavy strings; B64 is simpler & safe)
  }

  // ---------------- SigV4 (generic for this class) ----------------

  private async createSigV4(args: {
    method: "POST" | "GET";
    host: string;
    path: string; // "/v2/email/outbound-emails"
    amzDate: string; // YYYYMMDDTHHMMSSZ
    contentType: string; // "application/json"
    bodyStr: string;
  }): Promise<string> {
    const { method, host, path, amzDate, contentType, bodyStr } = args;
    const dateStamp = amzDate.slice(0, 8);
    const canonicalQueryString = "";
    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-date";
    const payloadHash = await this.sha256Hex(bodyStr);

    const canonicalRequest = [
      method,
      path,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${this.awsRegion}/ses/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await this.sha256Hex(canonicalRequest),
    ].join("\n");

    const signingKey = await this.getSignatureKey(
      this.awsSecretAccessKey,
      dateStamp,
      this.awsRegion,
      "ses"
    );
    const signature = await this.hmacHex(stringToSign, signingKey);

    return `${algorithm} Credential=${this.awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  private getAmzDate(): string {
    // YYYYMMDDTHHMMSSZ in UTC
    return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
  }

  private async sha256Hex(message: string): Promise<string> {
    const msg = new TextEncoder().encode(message);
    const hash = await crypto.subtle.digest("SHA-256", msg);
    return buf2hex(new Uint8Array(hash));
  }

  private async hmacHex(message: string, key: Uint8Array): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(message)
    );
    return buf2hex(new Uint8Array(sig));
  }

  private async getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<Uint8Array> {
    const kDate = await this.hmacBytes(
      dateStamp,
      new TextEncoder().encode("AWS4" + key)
    );
    const kRegion = await this.hmacBytes(regionName, kDate);
    const kService = await this.hmacBytes(serviceName, kRegion);
    const kSigning = await this.hmacBytes("aws4_request", kService);
    return kSigning;
  }

  private async hmacBytes(
    message: string,
    key: Uint8Array
  ): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(message)
    );
    return new Uint8Array(sig);
  }

  // ---------------- Helpers ----------------

  private async buildEmailTagsSafe(
    userId: string
  ): Promise<Array<{ Name: string; Value: string }>> {
    const hash = await this.sha256Hex(userId);
    const short = hash.slice(0, 12);
    return [
      { Name: "app", Value: "ten10" },
      { Name: "type", Value: "reminder" },
      { Name: "user_id_hash", Value: short },
    ];
  }

  private base64Encode(bytes: Uint8Array): string {
    // Encode Uint8Array to base64 using btoa on a binary string
    // Convert bytes to Latin1 string for btoa compatibility
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    // btoa expects Latin1; our input is raw bytes we just constructed
    return btoa(bin);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

// ---------------- Small utilities ----------------

function buf2hex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function cryptoRandomString(len = 24): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  // URL-safe-ish base32-ish: map to [a-z0-9]
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
