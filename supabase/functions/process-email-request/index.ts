import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { SimpleEmailService } from "../_shared/simple-email-service.ts";
import {
  EMAIL_THEME,
  getEmailHeader,
  getBodyStyles,
  getContainerStyles,
} from "../_shared/email-design.ts";

const WORKER_SECRET = (Deno.env.get("CLOUDFLARE_WORKER_SECRET") ?? "").trim();
const JUMBOMAIL_LINK = (Deno.env.get("JUMBOMAIL_LINK") ?? "").trim();
const RATE_LIMIT_DAILY = 3;

type IncomingPayload = {
  from: string;
  to?: string;
  subject?: string;
  messageId?: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // BUGFIX (Security): never allow "Bearer undefined" bypass.
  // If the secret is missing, fail closed.
  if (!WORKER_SECRET) {
    console.error(
      "Misconfiguration: CLOUDFLARE_WORKER_SECRET is missing or empty"
    );
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
  if (!JUMBOMAIL_LINK) {
    console.error("Misconfiguration: JUMBOMAIL_LINK is missing or empty");
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  let supabaseClient: SupabaseClient | null = null;
  let from: string | undefined;
  let to: string | undefined;
  let subject: string | undefined;
  let messageId: string | undefined;

  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${WORKER_SECRET}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const body = (await req.json()) as Partial<IncomingPayload>;
    ({ from, to, subject, messageId } = body);

    if (!from) {
      return new Response(
        JSON.stringify({ error: "Missing 'from' parameter" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Init Supabase
    supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate Limit Check via RPC
    const { data: currentCount, error: rpcError } = await supabaseClient.rpc(
      "increment_download_count",
      {
        p_email: from,
      }
    );

    if (rpcError) {
      throw new Error(`RPC Error: ${rpcError.message}`);
    }
    if (typeof currentCount !== "number" || !Number.isFinite(currentCount)) {
      throw new Error(
        "RPC Error: increment_download_count returned invalid data"
      );
    }

    // Prepare log data
    const logData = {
      from_email: from,
      reason: null,
      metadata: { to, subject, messageId, currentCount },
    };

    // Check limit
    if (currentCount > RATE_LIMIT_DAILY) {
      await supabaseClient.from("download_requests").insert({
        ...logData,
        status: "blocked",
        reason: "Rate limit exceeded",
      });
      return new Response(
        JSON.stringify({ status: "blocked", reason: "Rate limit" }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Send Email
    // Uses SES_FROM_MAASER if set, otherwise defaults to maaser@ten10-app.com (must be verified in SES)
    const senderEmail =
      Deno.env.get("SES_FROM_MAASER") ?? "maaser@ten10-app.com";
    const emailService = new SimpleEmailService(senderEmail);

    const emailText = `
שלום,

לבקשתך, הנה הקישור להורדת תוכנת Ten10:
${JUMBOMAIL_LINK}

אם הקישור לא נפתח, נא לבקש מסינון האינטרנט שלך לאשר אותו.

בברכה,
צוות Ten10
    `.trim();

    const htmlBody = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <style>
    body { ${getBodyStyles("rtl")} }
    .container { ${getContainerStyles("rtl")} }
    .content { padding: 32px; color: ${
      EMAIL_THEME.colors.textMain
    }; font-size: 16px; line-height: 1.6; }
    .btn { display: inline-block; background-color: ${
      EMAIL_THEME.colors.primary
    }; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px; }
    .btn-secondary { display: inline-block; background-color: transparent; color: ${
      EMAIL_THEME.colors.primary
    }; border: 1px solid ${
      EMAIL_THEME.colors.primary
    }; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500; margin-top: 12px; font-size: 14px; }
    .footer { font-size: 12px; color: ${
      EMAIL_THEME.colors.textLight
    }; margin-top: 32px; border-top: 1px solid ${
      EMAIL_THEME.colors.border
    }; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    ${getEmailHeader("he")}
    <div class="content">
      <p>שלום,</p>
      <p>לבקשתך, הנה הקישור להורדת תוכנת <strong>Ten10</strong> לניהול מעשרות:</p>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${JUMBOMAIL_LINK}" class="btn">להורדת התוכנה לחץ כאן</a>
      </div>

      <p style="font-size: 14px; background-color: ${
        EMAIL_THEME.colors.warning.bg
      }; padding: 12px; border-radius: 6px; border: 1px solid ${
      EMAIL_THEME.colors.warning.border
    }; color: ${EMAIL_THEME.colors.warning.text};">
        <strong>שים לב:</strong> אם הקישור לא נפתח (למשל בנטפרי/אתרוג), ייתכן שצריך לבקש אישור מיוחד מהסינון שלך עבור הקישור הספציפי הזה.
      </p>

      <div style="text-align: center; margin: 24px 0;">
        <a href="https://ten10-app.com/landing" class="btn-secondary">לפרטים נוספים על התוכנה</a>
      </div>

      <p>בברכה,<br>צוות Ten10</p>
      
      <div class="footer">
        <p>נא לא להשיב למייל זה. לשאלות ותמיכה ניתן לפנות לכתובת: <a href="mailto:support@ten10-app.com" style="color: ${
          EMAIL_THEME.colors.primary
        };">support@ten10-app.com</a></p>
        <p>קישור ישיר (JumboMail) להעתקה:<br>${JUMBOMAIL_LINK}</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    await emailService.sendRawEmail({
      to: from,
      subject: "קישור להורדת Ten10",
      textBody: emailText,
      htmlBody: htmlBody,
    });

    // Update Log to sent
    await supabaseClient.from("download_requests").insert({
      ...logData,
      status: "sent",
    });

    return new Response(JSON.stringify({ status: "sent" }), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error processing email request:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error ?? "Unknown error");

    // BUGFIX (Observability): log failed attempts as status=error whenever possible.
    try {
      if (supabaseClient && from) {
        await supabaseClient.from("download_requests").insert({
          from_email: from,
          status: "error",
          reason: errorMessage,
          metadata: { to, subject, messageId },
        });
      }
    } catch (logError) {
      console.error("Failed to write download_requests error log:", logError);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
