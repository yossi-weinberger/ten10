// This function is triggered by a database webhook on new contact_messages inserts.
// Its only job is to format and send an email notification using a raw, signed fetch request.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { SimpleEmailService } from "../_shared/simple-email-service.ts";
import {
  renderContactAttachmentListItem,
  renderContactEmail,
  renderContactEmailSubject,
  type ContactMessageRecord,
} from "./email-template.ts";

async function sendEmailNotification(
  supabaseAdminClient: SupabaseClient,
  insertedRecord: ContactMessageRecord,
) {
  // Use a dedicated sender for contact emails so it won't be affected by the global SES_FROM
  // (which may be set for reminder emails).
  const contactFrom =
    Deno.env.get("SES_FROM_CONTACT") ?? "contact-form@ten10-app.com";
  const emailService = new SimpleEmailService(contactFrom);

  const toEmail =
    insertedRecord.channel === "halacha"
      ? "torat.maaser@gmail.com"
      : "dev@ten10-app.com";

  const ccEmail =
    insertedRecord.channel === "halacha" ? "halacha@ten10-app.com" : undefined;

  const ticketNumber = `TEN-${new Date(
    insertedRecord.created_at,
  ).getFullYear()}-${insertedRecord.id.substring(0, 5).toUpperCase()}`;
  const subject = renderContactEmailSubject(
    insertedRecord.channel,
    ticketNumber,
    insertedRecord.subject,
  );

  let attachmentLinks = "";
  if (insertedRecord.attachments && insertedRecord.attachments.length > 0) {
    const signedUrls = await Promise.all(
      insertedRecord.attachments.map(async (att) => {
        const { data, error } = await supabaseAdminClient.storage
          .from("contact-attachments")
          .createSignedUrl(att.path, 60 * 60 * 24 * 7); // 7 days validity
        if (error) {
          console.error(`Error creating signed URL for ${att.path}:`, error);
          return renderContactAttachmentListItem(att.name, null);
        }
        return renderContactAttachmentListItem(att.name, data.signedUrl);
      }),
    );
    attachmentLinks = `
      <div style="margin: 0; padding: 0;">
        <div style="margin: 0 0 6px; color: #173e3e; font-size: 11px; font-weight: 700; line-height: 16px;">קבצים מצורפים / Attachments:</div>
        <ul style="margin: 0; padding: 0 0 0 18px;">
          ${signedUrls.join("")}
        </ul>
      </div>
    `;
  }

  const { htmlBody, textBody } = renderContactEmail({
    attachmentLinksHtml: attachmentLinks,
    channel: insertedRecord.channel,
    record: insertedRecord,
    ticketNumber,
  });

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
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin), status: 200 });
  }

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const payload = await req.json();
    if (payload.type !== "INSERT") {
      return new Response("Not an insert event, skipping.", { status: 200 });
    }

    const insertedRecord: ContactMessageRecord = payload.record;
    await sendEmailNotification(supabaseAdminClient, insertedRecord);

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending contact email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
      status: 500,
    });
  }
});
