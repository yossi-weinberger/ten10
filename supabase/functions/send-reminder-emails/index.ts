import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EmailService } from "./email-service.ts";
import { UserService } from "./user-service.ts";

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
    const emailService = new EmailService();

    // Get current date and check if it's a reminder day
    const currentDay = new Date().getDate();
    const reminderDays = [1, 7, 10, 15, 20]; // 7 added for testing

    // Test mode support
    const body = await req.json().catch(() => ({}));
    const isTest = body.test === true;

    if (!reminderDays.includes(currentDay) && !isTest) {
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
    const testDay = isTest ? 7 : currentDay;
    const usersWithBalances = await userService.getUsersWithTitheBalances(
      testDay
    );

    if (usersWithBalances.length === 0) {
      return new Response(
        JSON.stringify({
          message: `No users found with reminders enabled for day ${testDay}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Send bulk reminder emails
    const results = await emailService.sendBulkReminders(usersWithBalances);

    return new Response(
      JSON.stringify({
        message: `Processed ${
          usersWithBalances.length
        } users for day ${testDay}${isTest ? " (TEST MODE)" : ""}`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-reminder-emails function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
