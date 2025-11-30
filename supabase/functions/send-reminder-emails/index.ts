import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { UserService } from "./user-service.ts";
import { SimpleEmailService } from "./simple-email-service.ts";

// Deployment trigger note: editing this file forces the GitHub workflow to redeploy the function.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Security: Check for valid authorization
  const authorization = req.headers.get("Authorization");
  const validAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const validServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!authorization || !authorization.includes("Bearer")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized - Missing Bearer token" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Extract token from "Bearer TOKEN" format
  const token = authorization.replace("Bearer ", "");

  // Allow either ANON_KEY (for manual testing) or SERVICE_ROLE_KEY (for cron job)
  if (token !== validAnonKey && token !== validServiceKey) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Initialize services
    const userService = new UserService();
    const emailService = new SimpleEmailService();

    // Get current date and check if it's a reminder day
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentDayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday

    // Reminder days configuration:
    // 1st, 5th, 10th, 15th, 20th, 25th - monthly reminder schedule
    // 19th - special day for testing (can be removed in production)
    const reminderDays = [1, 5, 10, 15, 20, 25];

    let effectiveDay = currentDay;

    // If today is Saturday (6), skip sending emails
    if (currentDayOfWeek === 6) {
      return new Response(
        JSON.stringify({
          message: `Today is Saturday. Email reminders are not sent on Shabbat.`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // If today is Sunday (0), check if yesterday (Saturday) was a reminder day
    if (currentDayOfWeek === 0) {
      const yesterday = new Date(currentDate);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDay = yesterday.getDate();

      if (reminderDays.includes(yesterdayDay)) {
        effectiveDay = yesterdayDay; // Send reminders for yesterday's missed day
        console.log(
          `Sunday: Sending reminders for Saturday (day ${yesterdayDay}) that was skipped due to Shabbat`
        );
      }
    }

    if (!reminderDays.includes(effectiveDay)) {
      return new Response(
        JSON.stringify({
          message: `Today (${currentDay}) is not a reminder day. Reminder days: ${reminderDays.join(
            ", "
          )}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get users with tithe balances
    const usersWithBalances = await userService.getUsersWithTitheBalances(
      effectiveDay
    );

    if (usersWithBalances.length === 0) {
      return new Response(
        JSON.stringify({
          message: `No users found with reminders enabled for day ${effectiveDay}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Send bulk reminder emails
    const results = await emailService.sendBulkReminders(usersWithBalances);

    const sundayMessage =
      currentDayOfWeek === 0 && effectiveDay !== currentDay
        ? ` (sending Saturday reminders on Sunday due to Shabbat)`
        : "";

    return new Response(
      JSON.stringify({
        message: `Processed ${usersWithBalances.length} users for day ${effectiveDay}${sundayMessage}`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // Log full error details server-side for debugging
    console.error("Send reminder emails error:", {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
