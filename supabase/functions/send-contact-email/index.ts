// This function is triggered by a database webhook on new contact_messages inserts.
// Its only job is to format and send an email notification using a raw, signed fetch request.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { SimpleEmailService } from "../_shared/simple-email-service.ts";
import { EMAIL_THEME, getEmailHeader } from "../_shared/email-design.ts";

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
  supabaseAdminClient: SupabaseClient,
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
        return `<li><a href="${data.signedUrl}" style="font-weight: bold; font-size: 1.1em; color: #2b6cb0;">${att.name}</a></li>`;
      })
    );
    attachmentLinks = `
      <div style="margin-top: 20px; padding: 15px; background-color: #ebf8ff; border: 2px solid #4299e1; border-radius: 8px;">
        <h3 style="margin-top: 0; color: #2c5282;">קבצים מצורפים / Attachments:</h3>
        <ul style="margin-bottom: 0; padding-right: 20px;">
          ${signedUrls.join("")}
        </ul>
      </div>
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
          body { font-family: ${
            EMAIL_THEME.fonts.main
          }; line-height: 1.6; color: ${
      EMAIL_THEME.colors.textMain
    }; max-width: 600px; margin: 0 auto; padding: 0; direction: rtl; text-align: right; background-color: ${
      EMAIL_THEME.colors.background
    }; }
          .container { background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 40px auto; border-top: 6px solid ${
            EMAIL_THEME.colors.primary
          }; direction: rtl; text-align: right; }
          /* Header styles are inline in getEmailHeader */
          .content { padding: 40px 30px; direction: rtl; text-align: right; }
          .title { color: #111827; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 24px; text-align: right; }
          .info-grid { display: grid; grid-template-columns: auto 1fr; gap: 12px; margin-bottom: 24px; direction: rtl; }
          .label { font-weight: 600; color: ${
            EMAIL_THEME.colors.textSecondary
          }; text-align: right; }
          .value { color: #1f2937; text-align: right; }
          .message-box { background-color: #f3f4f6; padding: 20px; border-radius: 12px; border-right: 4px solid ${
            EMAIL_THEME.colors.primary
          }; margin: 24px 0; white-space: pre-wrap; font-size: 16px; color: #1f2937; direction: rtl; text-align: right; }
          .metadata { background-color: #f9fafb; padding: 24px; border-top: 1px solid ${
            EMAIL_THEME.colors.border
          }; font-size: 14px; color: ${EMAIL_THEME.colors.textLight}; }
          .metadata h3 { margin-top: 0; color: ${
            EMAIL_THEME.colors.textMain
          }; font-size: 16px; }
          .metadata ul { list-style: none; padding: 0; margin: 0; }
          .metadata li { padding: 6px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; }
          .metadata li:last-child { border-bottom: none; }
          .attachments { margin-top: 24px; background-color: #ecfeff; border: 1px solid #cffafe; border-radius: 8px; padding: 16px; }
          .attachments h3 { margin: 0 0 12px 0; color: #0e7490; font-size: 16px; }
          .attachments ul { list-style: none; padding: 0; margin: 0; }
          .attachments li { padding: 4px 0; }
          .attachments a { color: #0891b2; text-decoration: none; font-weight: 600; }
          .attachments a:hover { text-decoration: underline; }
          .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          .tag-high { background-color: #fee2e2; color: #991b1b; }
          .tag-med { background-color: #fef3c7; color: #92400e; }
          .tag-low { background-color: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="container">
          ${getEmailHeader("he")}
          <div class="content">
            <h2 class="title">פנייה חדשה לרב</h2>
            
            <div class="info-grid">
              <span class="label">מאת:</span>
              <span class="value">${insertedRecord.user_name || "אנונימי"} (${
      insertedRecord.user_email || "לא צוין"
    })</span>
              
              <span class="label">מספר כרטיס:</span>
              <span class="value">${ticketNumber}</span>
              
              <span class="label">נושא:</span>
              <span class="value"><strong>${
                insertedRecord.subject
              }</strong></span>
              
              ${
                severityText
                  ? `<span class="label">חומרה:</span><span class="value">${severityText}</span>`
                  : ""
              }
            </div>

            <div class="message-box">${insertedRecord.body}</div>
            
            ${
              attachmentLinks
                ? `<div class="attachments"><h3>קבצים מצורפים:</h3><ul>${attachmentLinks}</ul></div>`
                : ""
            }
          </div>
          
          <div class="metadata">
            <h3>מידע טכני:</h3>
            <ul>
              <li><span>פלטפורמה</span> <strong>${
                insertedRecord.client_platform
              }</strong></li>
              <li><span>גרסת אפליקציה</span> <strong>${
                insertedRecord.app_version || "לא זמין"
              }</strong></li>
              <li><span>שפה</span> <strong>${
                insertedRecord.locale || "לא זמין"
              }</strong></li>
              <li><span>מזהה משתמש</span> <strong>${
                insertedRecord.user_id || "אנונימי"
              }</strong></li>
              <li><span>IP</span> <strong>${
                insertedRecord.ip || "לא זמין"
              }</strong></li>
              <li><span>User Agent</span> <span style="max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${
                insertedRecord.user_agent || "לא זמין"
              }</span></li>
            </ul>
          </div>
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
    const severityBadge = insertedRecord.severity
      ? `<span class="tag tag-${insertedRecord.severity}">${
          severityLabels[insertedRecord.severity] || insertedRecord.severity
        }</span>`
      : "";

    htmlBody = `
      <!DOCTYPE html>
      <html dir="ltr" lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: ${
            EMAIL_THEME.fonts.main
          }; line-height: 1.6; color: ${
      EMAIL_THEME.colors.textMain
    }; max-width: 600px; margin: 0 auto; padding: 0; background-color: ${
      EMAIL_THEME.colors.background
    }; }
          .container { background-color: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin: 40px auto; border-top: 6px solid ${
            EMAIL_THEME.colors.primary
          }; }
          /* Header styles are inline */
          .content { padding: 40px 30px; }
          .title { color: #111827; font-size: 24px; font-weight: 700; margin-top: 0; margin-bottom: 24px; }
          .info-item { margin-bottom: 12px; }
          .label { font-weight: 600; color: ${
            EMAIL_THEME.colors.textSecondary
          }; min-width: 100px; display: inline-block; }
          .value { color: #1f2937; }
          .message-box { background-color: #f3f4f6; padding: 20px; border-radius: 12px; border-left: 4px solid ${
            EMAIL_THEME.colors.primary
          }; margin: 24px 0; white-space: pre-wrap; font-size: 16px; color: #1f2937; }
          .metadata { background-color: #f9fafb; padding: 24px; border-top: 1px solid ${
            EMAIL_THEME.colors.border
          }; font-size: 14px; color: ${EMAIL_THEME.colors.textLight}; }
          .metadata h3 { margin-top: 0; color: ${
            EMAIL_THEME.colors.textMain
          }; font-size: 16px; }
          .metadata ul { list-style: none; padding: 0; margin: 0; }
          .metadata li { padding: 6px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; }
          .metadata li:last-child { border-bottom: none; }
          .attachments { margin-top: 24px; background-color: #ecfeff; border: 1px solid #cffafe; border-radius: 8px; padding: 16px; }
          .attachments h3 { margin: 0 0 12px 0; color: #0e7490; font-size: 16px; }
          .attachments ul { list-style: none; padding: 0; margin: 0; }
          .attachments li { padding: 4px 0; }
          .attachments a { color: #0891b2; text-decoration: none; font-weight: 600; }
          .attachments a:hover { text-decoration: underline; }
          .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .tag-high { background-color: #fee2e2; color: #991b1b; }
          .tag-med { background-color: #fef3c7; color: #92400e; }
          .tag-low { background-color: #d1fae5; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="container">
          ${getEmailHeader("en")}
          <div class="content">
            <h2 class="title">New Contact Message</h2>
            
            <div class="info-item">
              <span class="label">From:</span>
              <span class="value">${insertedRecord.user_name || "Anonymous"} (${
      insertedRecord.user_email || "No email"
    })</span>
            </div>
            <div class="info-item">
              <span class="label">Ticket ID:</span>
              <span class="value">${ticketNumber}</span>
            </div>
            <div class="info-item">
              <span class="label">Subject:</span>
              <span class="value"><strong>${
                insertedRecord.subject
              }</strong></span>
            </div>
            ${
              insertedRecord.severity
                ? `<div class="info-item"><span class="label">Severity:</span>${severityBadge}</div>`
                : ""
            }

            <div class="message-box">${insertedRecord.body}</div>
            
            ${
              attachmentLinks
                ? `<div class="attachments"><h3>Attachments:</h3><ul>${attachmentLinks}</ul></div>`
                : ""
            }
          </div>
          
          <div class="metadata">
            <h3>Technical Metadata:</h3>
            <ul>
              <li><strong>Platform</strong> <span>${
                insertedRecord.client_platform
              }</span></li>
              <li><strong>App Version</strong> <span>${
                insertedRecord.app_version || "N/A"
              }</span></li>
              <li><strong>Locale</strong> <span>${
                insertedRecord.locale || "N/A"
              }</span></li>
              <li><strong>User ID</strong> <span>${
                insertedRecord.user_id || "Anonymous"
              }</span></li>
              <li><strong>IP</strong> <span>${
                insertedRecord.ip || "N/A"
              }</span></li>
              <li><strong>User Agent</strong> <span style="max-width: 200px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${
                insertedRecord.user_agent || "N/A"
              }</span></li>
            </ul>
          </div>
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
