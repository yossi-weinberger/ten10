import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { UserService } from "./user-service.ts";
import { SimpleEmailService } from "./simple-email-service.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

async function logRun(supabase: ReturnType<typeof createClient>, entry: {
  day_of_month: number;
  was_reminder_day: boolean;
  was_shabbat: boolean;
  users_processed: number;
  emails_sent: number;
  emails_failed: number;
  notes?: string;
}) {
  const { error } = await supabase.from("reminder_run_logs").insert(entry);
  if (error) {
    console.error("[REMINDER] Failed to log run:", error.message);
  }
}

// Deployment trigger note: editing this file forces the GitHub workflow to redeploy the function.

serve(async (req) => {
  const origin = req.headers.get("origin");

  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  // Security: Check for valid authorization
  const authorization = req.headers.get("Authorization");
  const validAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const validServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

  // Debug: Log what we have (without exposing full keys)
  console.log("[REMINDER] Auth check:", {
    hasAuthorization: !!authorization,
    hasAnonKey: !!validAnonKey,
    hasServiceKey: !!validServiceKey,
    anonKeyLength: validAnonKey?.length || 0,
    serviceKeyLength: validServiceKey?.length || 0,
  });

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

  // Extract token from "Bearer TOKEN" format
  const token = authorization.replace("Bearer ", "");

  // Check if token is API key (sb_publishable_... or sb_secret_...)
  const isApiKey =
    token.startsWith("sb_publishable_") || token.startsWith("sb_secret_");

  // If it's an API key, validate against known keys
  if (isApiKey) {
    console.log("[REMINDER] Token is API key, validating...");
    const tokenMatchesAnon = token === validAnonKey;
    const tokenMatchesService = token === validServiceKey;

    console.log("[REMINDER] Token validation:", {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + "...",
      validAnonKeyPrefix: validAnonKey?.substring(0, 20) + "..." || "MISSING",
      validServiceKeyPrefix:
        validServiceKey?.substring(0, 20) + "..." || "MISSING",
      tokenMatchesAnon,
      tokenMatchesService,
    });

    if (!tokenMatchesAnon && !tokenMatchesService) {
      console.error("[REMINDER] API key validation failed - returning 403");
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }
    console.log("[REMINDER] API key validated successfully");
  } else {
    // If it's a JWT token, validate it
    console.log("[REMINDER] Token is JWT, validating...");
    try {
      // Decode JWT to check role (without verification - we'll verify with Supabase)
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        console.error("[REMINDER] Invalid JWT format");
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 403,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        });
      }

      const tokenData = JSON.parse(atob(tokenParts[1])) as {
        role?: string;
        exp?: number;
      };

      // Check if JWT has service_role (for cron jobs)
      if (tokenData.role === "service_role") {
        // Check expiration first
        if (tokenData.exp && tokenData.exp < Date.now() / 1000) {
          console.error("[REMINDER] JWT token expired");
          return new Response(JSON.stringify({ error: "Token expired" }), {
            status: 403,
            headers: {
              ...getCorsHeaders(origin),
              "Content-Type": "application/json",
            },
          });
        }

        // Verify token by creating a client with the token and making a simple request
        // If token is invalid, Supabase will reject it
        const testClient = createClient(supabaseUrl, validAnonKey ?? "", {
          global: { headers: { Authorization: authorization } },
        });

        // Try to make a simple request - if token is invalid, this will fail
        const { error: testError } = await testClient
          .from("profiles")
          .select("id")
          .limit(1);

        if (testError) {
          // If error is related to JWT/auth, token is invalid
          if (
            testError.message.includes("JWT") ||
            testError.message.includes("token") ||
            testError.message.includes("auth")
          ) {
            console.error(
              "[REMINDER] JWT token validation failed:",
              testError.message,
            );
            return new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 403,
              headers: {
                ...getCorsHeaders(origin),
                "Content-Type": "application/json",
              },
            });
          }
          // Other errors (like network) are OK - token itself is valid
        }
        console.log("[REMINDER] JWT validated successfully (service_role)");
      } else {
        // For user tokens, validate with Supabase
        console.log(
          "[REMINDER] JWT is user token, validating with Supabase...",
        );
        const supabaseClient = createClient(supabaseUrl, validAnonKey ?? "", {
          global: { headers: { Authorization: authorization } },
        });

        const {
          data: { user },
          error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
          console.error(
            "[REMINDER] JWT validation failed:",
            userError?.message,
          );
          return new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 403,
            headers: {
              ...getCorsHeaders(origin),
              "Content-Type": "application/json",
            },
          });
        }
        console.log("[REMINDER] JWT validated successfully (user token)");
      }
    } catch (error) {
      console.error("[REMINDER] JWT validation error:", error);
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
    // Check for test mode in request body
    const body = await req.json().catch(() => ({}));
    let isTest = body.test === true;

    if (isTest) {
      // Validate that test mode is only allowed for service_role or admin
      // We already validated the token above, so we just need to check if it was a service key
      // or if we want to allow specific admin users (but service key is safest for now)

      const isServiceKey =
        authorization?.replace("Bearer ", "") === validServiceKey;

      // If we are using JWT, we can check the role
      let isServiceRole = false;
      if (!isServiceKey && authorization) {
        try {
          const token = authorization.replace("Bearer ", "");
          const tokenParts = token.split(".");
          if (tokenParts.length === 3) {
            const tokenData = JSON.parse(atob(tokenParts[1]));
            isServiceRole = tokenData.role === "service_role";
          }
        } catch (e) {
          // ignore error
        }
      }

      if (!isServiceKey && !isServiceRole) {
        console.warn(
          "[REMINDER] Unauthorized attempt to use test mode. Disabling test mode.",
        );
        isTest = false;
      } else {
        console.log(
          "[REMINDER] TEST MODE ENABLED (Authorized) - Will bypass day check",
        );
      }
    }

    // Service-role client for logging run results to reminder_run_logs.
    // Reuse already-resolved env values; missing secrets cause an early 500 below.
    if (!supabaseUrl || !validServiceKey) {
      console.error("[REMINDER] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
        status: 500,
        headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
      });
    }
    const supabaseAdmin = createClient(supabaseUrl, validServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Initialize services with error handling
    console.log("[REMINDER] Initializing services...");
    let userService: UserService;
    let emailService: SimpleEmailService;

    try {
      userService = new UserService();
      console.log("[REMINDER] UserService initialized successfully");
    } catch (error) {
      console.error("[REMINDER] Failed to initialize UserService:", error);
      throw new Error(`Failed to initialize UserService: ${error.message}`);
    }

    try {
      emailService = new SimpleEmailService();
      console.log("[REMINDER] SimpleEmailService initialized successfully");
    } catch (error) {
      console.error(
        "[REMINDER] Failed to initialize SimpleEmailService:",
        error,
      );
      throw new Error(
        `Failed to initialize SimpleEmailService: ${error.message}`,
      );
    }

    // Get current date in ISRAEL timezone.
    // The cron runs at 18:00 UTC = 20:00 IST (winter) / 21:00 IDT (summer).
    // Using UTC here caused a critical bug: on Fridays the UTC day is 5 (Friday)
    // but in Israel Shabbat has already started (sunset ~17:30-20:00). Using the
    // Israel date ensures the Shabbat check is correct regardless of DST.
    const nowUtc = new Date();
    const israelDateStr = nowUtc.toLocaleDateString("en-CA", {
      timeZone: "Asia/Jerusalem",
    }); // "YYYY-MM-DD"
    const israelDate = new Date(israelDateStr + "T12:00:00"); // noon = stable, no DST edge
    const currentDay = israelDate.getDate();
    const currentDayOfWeek = israelDate.getDay(); // 0=Sun, 5=Fri, 6=Sat

    // Reminder days configuration: 1st, 5th, 10th, 15th, 20th, 25th
    const reminderDays = [1, 5, 10, 15, 20, 25];

    let effectiveDay = currentDay;
    let shabbatNote = "";

    // Saturday (Israel time) — Shabbat. Skip entirely; Sunday will handle makeup.
    if (!isTest && currentDayOfWeek === 6) {
      await logRun(supabaseAdmin, {
        day_of_month: currentDay,
        was_reminder_day: false,
        was_shabbat: true,
        users_processed: 0,
        emails_sent: 0,
        emails_failed: 0,
        notes: "Shabbat (Saturday Israel) - skipped",
      });
      return new Response(
        JSON.stringify({ message: "Today is Shabbat (Saturday in Israel). Skipped." }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Friday (Israel time) — the cron fires AFTER sunset (Shabbat already started).
    // Skip Friday sends. Thursday makeup below handles Friday reminder days.
    if (!isTest && currentDayOfWeek === 5) {
      await logRun(supabaseAdmin, {
        day_of_month: currentDay,
        was_reminder_day: false,
        was_shabbat: false,
        users_processed: 0,
        emails_sent: 0,
        emails_failed: 0,
        notes: "Erev Shabbat (Friday Israel, cron fires after sunset) - skipped",
      });
      return new Response(
        JSON.stringify({ message: "Today is Erev Shabbat in Israel (cron fires after sunset). Skipped." }),
        { headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" }, status: 200 },
      );
    }

    // Sunday (Israel time) — makeup for missed Saturday reminder days.
    if (!isTest && currentDayOfWeek === 0) {
      const saturdayDate = new Date(israelDate);
      saturdayDate.setDate(saturdayDate.getDate() - 1);
      const saturdayDay = saturdayDate.getDate();
      if (reminderDays.includes(saturdayDay)) {
        effectiveDay = saturdayDay;
        shabbatNote = ` (Saturday makeup — day ${saturdayDay} sent on Sunday)`;
        console.log(`Sunday makeup: sending reminders for Saturday day ${saturdayDay}`);
      }
    }

    // Thursday (Israel time) — makeup for upcoming Friday reminder days.
    // Since Friday sends are skipped, we send them a day early on Thursday.
    if (!isTest && currentDayOfWeek === 4) {
      const tomorrowDate = new Date(israelDate);
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowDay = tomorrowDate.getDate();
      if (reminderDays.includes(tomorrowDay)) {
        effectiveDay = tomorrowDay;
        shabbatNote = ` (Friday makeup — day ${tomorrowDay} sent on Thursday before Shabbat)`;
        console.log(`Thursday makeup: sending reminders for Friday day ${tomorrowDay}`);
      }
    }

    // Update testDay after effectiveDay might have changed
    const finalTestDay = isTest ? 25 : effectiveDay;

    if (!isTest && !reminderDays.includes(effectiveDay)) {
      await logRun(supabaseAdmin, {
        day_of_month: currentDay,
        was_reminder_day: false,
        was_shabbat: false,
        users_processed: 0,
        emails_sent: 0,
        emails_failed: 0,
        notes: `Not a reminder day (days: ${reminderDays.join(", ")})`,
      });
      return new Response(
        JSON.stringify({
          message: `Today (${currentDay}) is not a reminder day. Reminder days: ${reminderDays.join(
            ", ",
          )}`,
        }),
        {
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }

    // Get users with tithe balances
    const usersWithBalances =
      await userService.getUsersWithTitheBalances(finalTestDay);

    if (usersWithBalances.length === 0) {
      await logRun(supabaseAdmin, {
        day_of_month: finalTestDay,
        was_reminder_day: true,
        was_shabbat: false,
        users_processed: 0,
        emails_sent: 0,
        emails_failed: 0,
        notes: `No users configured for day ${finalTestDay}${isTest ? " (TEST)" : ""}`,
      });
      return new Response(
        JSON.stringify({
          message: `No users found with reminders enabled for day ${finalTestDay}${isTest ? " (TEST MODE)" : ""}`,
        }),
        {
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
          status: 200,
        },
      );
    }

    // Send bulk reminder emails
    console.log(
      `[REMINDER] Starting to send emails to ${usersWithBalances.length} users for day ${finalTestDay}${isTest ? " (TEST MODE)" : ""}`,
    );
    const results = await emailService.sendBulkReminders(usersWithBalances);

    // Log detailed results for debugging
    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    console.log(
      `[REMINDER] Email sending completed: ${sentCount} sent, ${failedCount} failed`,
    );

    // Log any failures
    results.forEach((result) => {
      if (result.status === "failed") {
        console.error(
          `[REMINDER] Failed to send email to ${result.email}: ${result.error}`,
        );
      } else {
        console.log(
          `[REMINDER] Successfully sent email to ${result.email}, messageId: ${result.messageId}`,
        );
      }
    });

    const sundayMessage = isTest ? "" : shabbatNote;

    await logRun(supabaseAdmin, {
      day_of_month: finalTestDay,
      was_reminder_day: true,
      was_shabbat: false,
      users_processed: usersWithBalances.length,
      emails_sent: sentCount,
      emails_failed: failedCount,
      notes: sundayMessage || (isTest ? "TEST MODE" : undefined),
    });

    return new Response(
      JSON.stringify({
        message: `Processed ${usersWithBalances.length} users for day ${finalTestDay}${sundayMessage}${isTest ? " (TEST MODE)" : ""}. Sent: ${sentCount}, Failed: ${failedCount}`,
        results,
      }),
      {
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
        status: 200,
      },
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
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});
