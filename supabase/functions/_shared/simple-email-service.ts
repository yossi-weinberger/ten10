import { dryRunEmailResult, guardEmailSend } from "./email-guard.ts";
import {
  base64Encode,
  createSesAuthorization,
  foldBase64,
  getAmzDate,
} from "./ses-v4.ts";

// Note: This is a simplified version of the reminder service's email logic,
// adapted for generic use. It does not include List-Unsubscribe headers.

export type RawEmailSendResult = {
  MessageId?: string;
  dryRun?: boolean;
} & Record<string, unknown>;

export class SimpleEmailService {
  private awsAccessKeyId: string;
  private awsSecretAccessKey: string;
  private awsRegion: string;
  private fromEmail: string;
  private functionName: string;

  constructor(fromOverride?: string, functionName = "edge-email") {
    this.awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") ?? "";
    this.awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "";
    this.awsRegion = Deno.env.get("AWS_REGION") ?? "eu-central-1";
    // Allow overriding the sender via constructor, then SES_FROM; default remains the contact form address
    this.fromEmail =
      fromOverride ?? Deno.env.get("SES_FROM") ?? "contact-form@ten10-app.com";
    this.functionName = functionName;
  }

  private assertCanSend(): void {
    if (!this.awsAccessKeyId || !this.awsSecretAccessKey) {
      throw new Error("Missing AWS credentials.");
    }
  }

  async sendRawEmail(args: {
    to: string;
    cc?: string;
    replyTo?: string;
    subject: string;
    textBody: string;
    htmlBody: string;
  }): Promise<RawEmailSendResult> {
    const decision = guardEmailSend({
      recipients: args.cc ? [args.to, args.cc] : [args.to],
      subject: args.subject,
      functionName: this.functionName,
    });
    if (decision.action === "hold") {
      return dryRunEmailResult();
    }

    this.assertCanSend();

    const kept = new Set(
      decision.recipients.map((recipient) => recipient.trim().toLowerCase()),
    );
    if (!kept.has(args.to.trim().toLowerCase())) {
      return dryRunEmailResult();
    }
    const cc =
      args.cc && kept.has(args.cc.trim().toLowerCase()) ? args.cc : undefined;

    const mimeBytes = await this.buildRawMime(args);

    const payload: any = {
      FromEmailAddress: this.fromEmail,
      Destination: {
        ToAddresses: [args.to],
      },
      Content: {
        Raw: { Data: base64Encode(mimeBytes) },
      },
    };

    if (cc) {
      payload.Destination.CcAddresses = [cc];
    }

    const host = `email.${this.awsRegion}.amazonaws.com`;
    const path = "/v2/email/outbound-emails";
    const endpoint = `https://${host}${path}`;
    const amzDate = getAmzDate();
    const bodyStr = JSON.stringify(payload);

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
      const errorText = await res.text();
      throw new Error(`SES V2 error: ${res.status} ${errorText}`);
    }

    return await res.json();
  }

  private async buildRawMime(args: {
    to: string;
    replyTo?: string;
    subject: string;
    textBody: string;
    htmlBody: string;
  }): Promise<Uint8Array> {
    const { to, replyTo, subject, textBody, htmlBody } = args;
    const boundary = `=_ten10_${crypto.randomUUID()}`;

    const textBase64 = foldBase64(
      base64Encode(new TextEncoder().encode(textBody)),
    );
    const htmlBase64 = foldBase64(
      base64Encode(new TextEncoder().encode(htmlBody)),
    );

    const headers = [
      `From: ${this.fromEmail}`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${base64Encode(
        new TextEncoder().encode(subject)
      )}?=`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ];

    if (replyTo) {
      headers.push(`Reply-To: ${replyTo}`);
    }

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
}
