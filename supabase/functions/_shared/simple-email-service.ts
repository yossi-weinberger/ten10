// Note: This is a simplified version of the reminder service's email logic,
// adapted for generic use. It does not include List-Unsubscribe headers.

export class SimpleEmailService {
  private awsAccessKeyId: string;
  private awsSecretAccessKey: string;
  private awsRegion: string;
  private fromEmail: string;

  constructor(fromOverride?: string) {
    this.awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") ?? "";
    this.awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "";
    this.awsRegion = Deno.env.get("AWS_REGION") ?? "eu-central-1";
    // Allow overriding the sender via constructor, then SES_FROM; default remains the contact form address
    this.fromEmail =
      fromOverride ?? Deno.env.get("SES_FROM") ?? "contact-form@ten10-app.com";

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
  }) {
    const mimeBytes = await this.buildRawMime(args);

    const payload: any = {
      FromEmailAddress: this.fromEmail,
      Destination: {
        ToAddresses: [args.to],
      },
      Content: {
        Raw: { Data: this.base64Encode(mimeBytes) },
      },
    };

    if (args.cc) {
      payload.Destination.CcAddresses = [args.cc];
    }

    const host = `email.${this.awsRegion}.amazonaws.com`;
    const path = "/v2/email/outbound-emails";
    const endpoint = `https://${host}${path}`;
    const amzDate = this.getAmzDate();
    const bodyStr = JSON.stringify(payload);

    const authorization = await this.createSigV4({
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

    const textBase64 = this.base64Encode(new TextEncoder().encode(textBody));
    const htmlBase64 = this.base64Encode(new TextEncoder().encode(htmlBody));

    const headers = [
      `From: ${this.fromEmail}`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${this.base64Encode(
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

  private getAmzDate(): string {
    return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
  }

  private async sha256Hex(message: string): Promise<string> {
    const msg = new TextEncoder().encode(message);
    const hash = await crypto.subtle.digest("SHA-256", msg);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private async createSigV4(args: {
    method: "POST" | "GET";
    host: string;
    path: string;
    amzDate: string;
    contentType: string;
    bodyStr: string;
  }): Promise<string> {
    const { method, host, path, amzDate, contentType, bodyStr } = args;
    const dateStamp = amzDate.slice(0, 8);
    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-date";
    const payloadHash = await this.sha256Hex(bodyStr);

    const canonicalRequest = [
      method,
      path,
      "", // canonicalQueryString is empty
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
    return await this.hmacBytes("aws4_request", kService);
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

  private async hmacHex(message: string, key: Uint8Array): Promise<string> {
    const sig = await this.hmacBytes(message, key);
    return Array.from(sig)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private base64Encode(bytes: Uint8Array): string {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) {
      bin += String.fromCharCode(bytes[i]);
    }
    return btoa(bin);
  }
}
