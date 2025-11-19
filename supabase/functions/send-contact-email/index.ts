// This function is triggered by a database webhook on new contact_messages inserts.
// Its only job is to format and send an email notification using a raw, signed fetch request.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { SimpleEmailService } from "../_shared/simple-email-service.ts";

interface ContactMessage {
  id: string;
  created_at: string;
  channel: "halacha" | "dev";
  subject: string;
  body: string;
  severity?: "low" | "med" | "high";
  attachments?: { path: string; name: string }[];
  client_platform: string;
  app_version?: string;
  locale?: string;
  ip?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  session_id?: string;
  user_agent?: string;
}

async function sendEmailNotification(
  supabaseAdminClient: any,
  insertedRecord: ContactMessage
) {
  const emailService = new SimpleEmailService();

  const toEmail =
    insertedRecord.channel === "halacha"
      ? "torat.maaser@gmail.com"
      : "dev@ten10-app.com";

  const ccEmail =
    insertedRecord.channel === "halacha" ? "halacha@ten10-app.com" : undefined;

  const channelLabel = insertedRecord.channel.toUpperCase();
  const ticketNumber = `TEN-${new Date(
    insertedRecord.created_at
  ).getFullYear()}-${insertedRecord.id.substring(0, 5).toUpperCase()}`;
  const subject = `[TEN10][${channelLabel}] #${ticketNumber} - ${insertedRecord.subject}`;

  let attachmentLinks = "";
  if (insertedRecord.attachments && insertedRecord.attachments.length > 0) {
    const signedUrls = await Promise.all(
      insertedRecord.attachments.map(async (att) => {
        const { data, error } = await supabaseAdminClient.storage
          .from("contact-attachments")
          .createSignedUrl(att.path, 60 * 60 * 24 * 7); // 7 days validity
        if (error) {
          console.error(`Error creating signed URL for ${att.path}:`, error);
          return `<li>${att.name} (Error generating link)</li>`;
        }
        return `<li><a href="${data.signedUrl}">${att.name}</a></li>`;
      })
    );
    attachmentLinks = `
      <h3>Attachments:</h3>
      <ul>
        ${signedUrls.join("")}
      </ul>
    `;
  }

  // Generate HTML email body with separate templates for Hebrew (Rabbi) and English (Dev)
  let htmlBody: string;
  let textBody: string;

  if (insertedRecord.channel === "halacha") {
    // Hebrew template for Rabbi (RTL)
    const severityText = insertedRecord.severity
      ? `חומרה: ${
          insertedRecord.severity === "high"
            ? "גבוהה"
            : insertedRecord.severity === "med"
            ? "בינונית"
            : "נמוכה"
        }`
      : "";

    htmlBody = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; direction: rtl; text-align: right; }
          .header { background-color: #4a5568; color: white; padding: 20px; border-radius: 5px 5px 0 0; text-align: right; }
          .content { background-color: #f7fafc; padding: 20px; border: 1px solid #e2e8f0; text-align: right; }
          .content p { text-align: right; }
          .content h3 { text-align: right; }
          .message-box { background-color: white; padding: 15px; border-right: 4px solid #4299e1; margin: 15px 0; white-space: pre-wrap; text-align: right; direction: rtl; }
          .metadata { background-color: #edf2f7; padding: 15px; margin-top: 15px; border-radius: 5px; text-align: right; }
          .metadata h3 { text-align: right; }
          .metadata ul { list-style: none; padding: 0; text-align: right; }
          .metadata li { padding: 5px 0; border-bottom: 1px solid #cbd5e0; text-align: right; }
          .metadata li:last-child { border-bottom: none; }
          .metadata li strong { text-align: right; }
          .attachments { margin-top: 20px; text-align: right; }
          .attachments h3 { text-align: right; }
          .attachments ul { list-style: none; padding: 0; text-align: right; }
          .attachments li { padding: 5px 0; text-align: right; }
          .attachments a { color: #4299e1; text-decoration: none; }
          .attachments a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">פנייה חדשה לרב</h2>
        </div>
        <div class="content">
          <p><strong>מאת:</strong> ${insertedRecord.user_name || "אנונימי"} (${
      insertedRecord.user_email || "לא צוין"
    })</p>
          <p><strong>מספר כרטיס:</strong> ${ticketNumber}</p>
          <p><strong>נושא:</strong> ${insertedRecord.subject}</p>
          ${severityText ? `<p><strong>${severityText}</strong></p>` : ""}
          <hr>
          <h3>הודעה:</h3>
          <div class="message-box">${insertedRecord.body}</div>
          <div class="metadata">
            <h3>מידע טכני:</h3>
            <ul>
              <li><strong>פלטפורמה:</strong> ${
                insertedRecord.client_platform
              }</li>
              <li><strong>גרסת אפליקציה:</strong> ${
                insertedRecord.app_version || "לא זמין"
              }</li>
              <li><strong>שפה:</strong> ${
                insertedRecord.locale || "לא זמין"
              }</li>
              <li><strong>מזהה משתמש:</strong> ${
                insertedRecord.user_id || "אנונימי"
              }</li>
              <li><strong>כתובת IP:</strong> ${
                insertedRecord.ip || "לא זמין"
              }</li>
              <li><strong>User Agent:</strong> ${
                insertedRecord.user_agent || "לא זמין"
              }</li>
            </ul>
          </div>
          ${
            attachmentLinks
              ? `<div class="attachments">${attachmentLinks}</div>`
              : ""
          }
        </div>
      </body>
      </html>
    `;
    textBody = `פנייה חדשה לרב. כרטיס: ${ticketNumber}. נושא: ${insertedRecord.subject}. הודעה: ${insertedRecord.body}`;
  } else {
    // English template for Dev Team (LTR)
    const severityLabels: Record<string, string> = {
      low: "Low",
      med: "Medium",
      high: "High",
    };
    const severityText = insertedRecord.severity
      ? `<p><strong>Severity:</strong> ${
          severityLabels[insertedRecord.severity] || insertedRecord.severity
        }</p>`
      : "";

    htmlBody = `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2d3748; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f7fafc; padding: 20px; border: 1px solid #e2e8f0; }
          .message-box { background-color: white; padding: 15px; border-left: 4px solid #4299e1; margin: 15px 0; white-space: pre-wrap; }
          .metadata { background-color: #edf2f7; padding: 15px; margin-top: 15px; border-radius: 5px; }
          .metadata ul { list-style: none; padding: 0; }
          .metadata li { padding: 5px 0; border-bottom: 1px solid #cbd5e0; }
          .metadata li:last-child { border-bottom: none; }
          .attachments { margin-top: 20px; }
          .attachments ul { list-style: none; padding: 0; }
          .attachments li { padding: 5px 0; }
          .attachments a { color: #4299e1; text-decoration: none; }
          .attachments a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 0;">New Contact Message - Dev Team</h2>
        </div>
        <div class="content">
          <p><strong>From:</strong> ${
            insertedRecord.user_name || "Anonymous"
          } (${insertedRecord.user_email || "No email provided"})</p>
          <p><strong>Ticket ID:</strong> ${ticketNumber}</p>
          <p><strong>Subject:</strong> ${insertedRecord.subject}</p>
          ${severityText}
          <hr>
          <h3>Message:</h3>
          <div class="message-box">${insertedRecord.body}</div>
          <div class="metadata">
            <h3>Metadata:</h3>
            <ul>
              <li><strong>Platform:</strong> ${
                insertedRecord.client_platform
              }</li>
              <li><strong>App Version:</strong> ${
                insertedRecord.app_version || "N/A"
              }</li>
              <li><strong>Locale:</strong> ${
                insertedRecord.locale || "N/A"
              }</li>
              <li><strong>User ID:</strong> ${
                insertedRecord.user_id || "Anonymous"
              }</li>
              <li><strong>IP:</strong> ${insertedRecord.ip || "N/A"}</li>
              <li><strong>User Agent:</strong> ${
                insertedRecord.user_agent || "N/A"
              }</li>
            </ul>
          </div>
          ${
            attachmentLinks
              ? `<div class="attachments">${attachmentLinks}</div>`
              : ""
          }
        </div>
      </body>
      </html>
    `;
    textBody = `New contact message. Ticket: ${ticketNumber}. Subject: ${
      insertedRecord.subject
    }.${
      insertedRecord.severity
        ? ` Severity: ${
            severityLabels[insertedRecord.severity] || insertedRecord.severity
          }.`
        : ""
    } Message: ${insertedRecord.body}`;
  }

  await emailService.sendRawEmail({
    to: toEmail,
    cc: ccEmail,
    replyTo: insertedRecord.user_email,
    subject,
    htmlBody,
    textBody,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders, status: 200 });
  }

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload = await req.json();
    if (payload.type !== "INSERT") {
      return new Response("Not an insert event, skipping.", { status: 200 });
    }

    const insertedRecord: ContactMessage = payload.record;
    await sendEmailNotification(supabaseAdminClient, insertedRecord);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending contact email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
