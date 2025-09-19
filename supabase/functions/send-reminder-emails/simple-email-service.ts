/**
 * Simple Email Service using SES REST API via fetch
 * Works around AWS SDK compatibility issues in Deno Edge Functions
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

  constructor() {
    this.awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID") ?? "";
    this.awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "";
    this.awsRegion = Deno.env.get("AWS_REGION") ?? "eu-central-1";
    this.fromEmail =
      Deno.env.get("SES_FROM") ?? "reminder-noreply@ten10-app.com";
  }

  async sendReminderEmail(
    userEmail: string,
    userId: string,
    titheBalance: number
  ): Promise<EmailResult> {
    try {
      // Generate secure unsubscribe URLs
      const unsubscribeUrls = await generateUnsubscribeUrls(userId, userEmail);

      const templateData: EmailTemplateData = {
        titheBalance,
        isPositive: titheBalance > 0,
        isNegative: titheBalance < 0,
        unsubscribeUrls,
      };

      const subject = generateReminderEmailSubject(templateData);
      const htmlBody = generateReminderEmailHTML(templateData);

      // Create SES SendEmail request body
      const requestBody = new URLSearchParams({
        Action: "SendEmail",
        Version: "2010-12-01",
        Source: this.fromEmail,
        "Destination.ToAddresses.member.1": userEmail,
        "Message.Subject.Data": subject,
        "Message.Subject.Charset": "UTF-8",
        "Message.Body.Html.Data": htmlBody,
        "Message.Body.Html.Charset": "UTF-8",
        // Add unsubscribe headers
        "MessageHeaders.member.1.Name": "List-Unsubscribe",
        "MessageHeaders.member.1.Value": `<${unsubscribeUrls.allUrl}>`,
        "MessageHeaders.member.2.Name": "List-Unsubscribe-Post",
        "MessageHeaders.member.2.Value": "List-Unsubscribe=One-Click",
        // Add tags
        "Tags.member.1.Name": "app",
        "Tags.member.1.Value": "ten10",
        "Tags.member.2.Name": "type",
        "Tags.member.2.Value": "reminder",
        "Tags.member.3.Name": "user_id",
        "Tags.member.3.Value": userId,
      });

      // Create AWS signature
      const signature = await this.createAWSSignature(
        "POST",
        requestBody.toString()
      );

      // Send request to SES
      const response = await fetch(
        `https://email.${this.awsRegion}.amazonaws.com/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            Authorization: signature,
            "X-Amz-Date": this.getAmzDate(),
          },
          body: requestBody.toString(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SES API error: ${response.status} ${errorText}`);
      }

      const responseText = await response.text();
      // Parse MessageId from XML response (simple regex)
      const messageIdMatch = responseText.match(
        /<MessageId>(.*?)<\/MessageId>/
      );
      const messageId = messageIdMatch ? messageIdMatch[1] : undefined;

      return {
        userId,
        email: userEmail,
        titheBalance,
        messageId,
        status: "sent",
      };
    } catch (error) {
      console.error(`Error sending email to ${userEmail}:`, error);

      return {
        userId,
        email: userEmail,
        titheBalance,
        status: "failed",
        error: error.message,
      };
    }
  }

  async sendBulkReminders(
    users: Array<{ id: string; email: string; titheBalance: number }>
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Process emails sequentially to avoid rate limiting
    for (const user of users) {
      const result = await this.sendReminderEmail(
        user.email,
        user.id,
        user.titheBalance
      );
      results.push(result);

      // Small delay between emails to be respectful to SES
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  private async createAWSSignature(
    method: string,
    body: string
  ): Promise<string> {
    const amzDate = this.getAmzDate();
    const dateStamp = amzDate.substring(0, 8);

    // Create canonical request
    const canonicalHeaders = `host:email.${this.awsRegion}.amazonaws.com\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-date";
    const payloadHash = await this.sha256(body);

    const canonicalRequest = [
      method,
      "/",
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    // Create string to sign
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${this.awsRegion}/email/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      await this.sha256(canonicalRequest),
    ].join("\n");

    // Calculate signature
    const signingKey = await this.getSignatureKey(
      this.awsSecretAccessKey,
      dateStamp,
      this.awsRegion,
      "email"
    );
    const signature = await this.hmacSha256(stringToSign, signingKey);

    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${this.awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return authorizationHeader;
  }

  private getAmzDate(): string {
    return new Date().toISOString().replace(/[:\-]|\.\d{3}/g, "");
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async hmacSha256(message: string, key: Uint8Array): Promise<string> {
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(message)
    );
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  private async getSignatureKey(
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ): Promise<Uint8Array> {
    const kDate = await this.hmacSha256Bytes(
      dateStamp,
      new TextEncoder().encode("AWS4" + key)
    );
    const kRegion = await this.hmacSha256Bytes(regionName, kDate);
    const kService = await this.hmacSha256Bytes(serviceName, kRegion);
    const kSigning = await this.hmacSha256Bytes("aws4_request", kService);
    return kSigning;
  }

  private async hmacSha256Bytes(
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
    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(message)
    );
    return new Uint8Array(signature);
  }
}
