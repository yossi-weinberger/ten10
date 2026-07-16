/**
 * Edge Function: send-cron-alerts
 * Monitors cron job executions and Edge Function errors, sends alerts when failures occur
 *
 * This function should be called periodically (e.g., every hour) to check for:
 * - Failed cron jobs
 * - Edge Function errors (5xx status codes)
 *
 * Sends email notifications to admins when failures are detected.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { SimpleEmailService } from "../_shared/simple-email-service.ts";
import {
  generateAlertEmailHTML,
  generateAlertEmailSubject,
  generateAlertEmailText,
  type CronJobFailure,
} from "./email-template.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  const origin = req.headers.get("origin");

  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  // Security: Check for valid authorization
  const authorization = req.headers.get("Authorization");
  if (!authorization || !authorization.includes("Bearer")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized - Missing Bearer token" }),
      {
        status: 401,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      },
    );
  }

  // Extract token and validate (similar to other functions)
  const token = authorization.replace("Bearer ", "");
  const validServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const validAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  // Check if token is API key (sb_publishable_... or sb_secret_...)
  const isApiKey =
    token.startsWith("sb_publishable_") || token.startsWith("sb_secret_");

  if (isApiKey) {
    // Validate against known keys
    if (token !== validAnonKey && token !== validServiceKey) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }
  } else {
    // JWT token - validate with Supabase
    // We create a client with the incoming token to verify it's valid and signed by our project
    const testClient = createClient(supabaseUrl, validAnonKey ?? "", {
      global: { headers: { Authorization: authorization } },
    });

    // Make a lightweight request to verify the token
    const { error: testError } = await testClient
      .from("profiles")
      .select("id")
      .limit(1);

    if (
      testError &&
      (testError.message.includes("JWT") ||
        testError.message.includes("Invalid token"))
    ) {
      console.error("[AUTH] JWT validation failed:", testError.message);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for cron job failures in the last 24 hours
    const { data: cronFailures, error: cronError } = await supabase.rpc(
      "get_cron_job_failures",
      {
        hours_back: 24,
      },
    );

    if (cronError) {
      console.error("Error fetching cron failures:", cronError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch cron job failures",
          details: cronError.message,
        }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const failures: CronJobFailure[] = cronFailures || [];

    if (failures.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No failures detected in the last 24 hours",
        }),
        {
          status: 200,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Get admin emails
    const { data: adminEmails, error: adminError } = await supabase
      .from("admin_emails")
      .select("email");

    if (adminError || !adminEmails || adminEmails.length === 0) {
      console.error("No admin emails found");
      return new Response(
        JSON.stringify({ error: "No admin emails configured" }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Send alert emails
    const emailService = new SimpleEmailService();
    const results: Array<{
      email: string;
      status: string;
      messageId?: string;
      error?: string;
    }> = [];
    const htmlBody = generateAlertEmailHTML(failures);
    const textBody = generateAlertEmailText(failures);

    for (const admin of adminEmails) {
      try {
        const result = await emailService.sendRawEmail({
          to: admin.email,
          subject: generateAlertEmailSubject(failures),
          htmlBody,
          textBody,
        });

        results.push({
          email: admin.email,
          status: "sent",
          messageId: result.MessageId,
        });
      } catch (error) {
        results.push({
          email: admin.email,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Checked for failures, found ${failures.length} cron job failure(s)`,
        failures,
        emailsSent: results.filter((r) => r.status === "sent").length,
        emailsFailed: results.filter((r) => r.status === "failed").length,
        results,
      }),
      {
        status: 200,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error in send-cron-alerts:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      },
    );
  }
});
