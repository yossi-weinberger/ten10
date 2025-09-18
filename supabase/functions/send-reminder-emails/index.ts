import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { UserService } from "./user-service.ts";
import { SimpleEmailService } from "./simple-email-service.ts";

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

  try {
    // Initialize services
    const userService = new UserService();
    const emailService = new SimpleEmailService();

    // Get current date and check if it's a reminder day
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentDayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const reminderDays = [1, 5, 10, 15, 20]; // 7 added for testing

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
    console.error("Error in send-reminder-emails function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
