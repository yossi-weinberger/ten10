/**
 * Email Service for sending reminder emails
 * Handles AWS SES integration and email sending logic
 */

import {
  SESv2Client,
  SendEmailCommand,
} from "npm:@aws-sdk/client-sesv2@3.879.0";
import {
  generateReminderEmailHTML,
  generateReminderEmailSubject,
  EmailTemplateData,
} from "./email-templates.ts";

export interface EmailResult {
  userId: string;
  email: string;
  titheBalance: number;
  messageId?: string;
  status: "sent" | "failed";
  error?: string;
}

export class EmailService {
  private sesClient: SESv2Client;
  private fromEmail: string;

  constructor() {
    this.sesClient = new SESv2Client({
      region: Deno.env.get("AWS_REGION") ?? "eu-central-1",
      credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") ?? "",
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "",
      },
    });

    this.fromEmail =
      Deno.env.get("SES_FROM") ?? "reminder-noreply@ten10-app.com";
  }

  async sendReminderEmail(
    userEmail: string,
    userId: string,
    titheBalance: number
  ): Promise<EmailResult> {
    try {
      const templateData: EmailTemplateData = {
        titheBalance,
        isPositive: titheBalance > 0,
        isNegative: titheBalance < 0,
      };

      const subject = generateReminderEmailSubject(templateData);
      const htmlBody = generateReminderEmailHTML(templateData);

      const command = new SendEmailCommand({
        FromEmailAddress: this.fromEmail,
        Destination: { ToAddresses: [userEmail] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: htmlBody, Charset: "UTF-8" } },
          },
        },
        EmailTags: [
          { Name: "app", Value: "ten10" },
          { Name: "type", Value: "reminder" },
          { Name: "user_id", Value: userId },
        ],
      });

      const result = await this.sesClient.send(command);

      return {
        userId,
        email: userEmail,
        titheBalance,
        messageId: result.MessageId,
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
}
