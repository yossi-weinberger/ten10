import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getIsraelDate } from "../_shared/israel-date.ts";
import {
  buildReminderRunLog,
  resolveMaaserYearCloseReminder,
  resolveReminderSchedule,
  type ReminderScheduleResolution,
} from "./reminder-schedule.ts";
import {
  deduplicateReminderUsers,
  resolveDueReminderCohorts,
  type DueReminderCohort,
} from "./reminder-cohorts.ts";
import { SimpleEmailService } from "./simple-email-service.ts";
import { UserService } from "./user-service.ts";

async function logRun(supabase: ReturnType<typeof createClient>, entry: {
  day_of_month: number;
  was_reminder_day: boolean;
  was_shabbat: boolean;
  was_yom_tov: boolean;
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

function assertNever(value: never): never {
  throw new Error(`Unsupported reminder schedule result: ${String(value)}`);
}

function describeCohort(cohort: DueReminderCohort): string {
  const { calendarType, reminderDay, resolution } = cohort;
  return resolution.kind === "makeup"
    ? `${calendarType}:day=${reminderDay},${resolution.reason}-makeup-for=${resolution.reminderDate}`
    : `${calendarType}:day=${reminderDay},send-today`;
}

// Deployment trigger note: editing this file forces the GitHub workflow to redeploy the function.

serve(async (req) => {
  const origin = req.headers.get("origin");

  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  // Fail fast on missing secrets — before any createClient call that would give
  // a misleading 403 "Invalid token" instead of a 500 "misconfiguration".
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const validServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const validAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !validServiceKey) {
    console.error("[REMINDER] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  // Security: Check for valid authorization
  const authorization = req.headers.get("Authorization");

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
    // supabaseUrl and validServiceKey are guaranteed non-null — checked at the top.
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

    const currentIsraelDate = getIsraelDate();
    const currentDay = Number(currentIsraelDate.slice(8, 10));
    const reminderDays = [1, 5, 10, 15, 20, 25];
    const fallbackResolution: ReminderScheduleResolution =
      resolveReminderSchedule(
        currentIsraelDate,
        reminderDays,
        "gregorian",
      );
    const dueCohorts: DueReminderCohort[] = isTest
      ? [
          {
            calendarType: "gregorian",
            reminderDay: 25,
            resolution: { kind: "send-today", reminderDay: 25 },
          },
          {
            calendarType: "hebrew",
            reminderDay: 25,
            resolution: { kind: "send-today", reminderDay: 25 },
          },
        ]
      : resolveDueReminderCohorts(currentIsraelDate, reminderDays);
    const yearlyResolution = isTest
      ? ({ kind: "no-op" } satisfies ReminderScheduleResolution)
      : resolveMaaserYearCloseReminder(currentIsraelDate);
    const yearlyDue =
      yearlyResolution.kind === "send-today" ||
      yearlyResolution.kind === "makeup";

    if (dueCohorts.length === 0 && !yearlyDue) {
      switch (fallbackResolution.kind) {
        case "skip": {
          const logEntry = buildReminderRunLog(
            currentIsraelDate,
            fallbackResolution,
          );
          await logRun(supabaseAdmin, logEntry);
          console.log("[REMINDER] Schedule skipped:", logEntry.notes);
          return new Response(
            JSON.stringify({
              message: logEntry.notes,
              reason: fallbackResolution.reason,
              was_yom_tov: logEntry.was_yom_tov,
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
        case "no-op": {
          const logEntry = buildReminderRunLog(
            currentIsraelDate,
            fallbackResolution,
          );
          logEntry.notes =
            `Not a reminder day in either calendar (days: ${reminderDays.join(", ")})`;
          await logRun(supabaseAdmin, logEntry);
          return new Response(
            JSON.stringify({
              message:
                `Today (${currentDay}) is not a reminder day in either calendar. Reminder days: ${reminderDays.join(", ")}`,
              was_yom_tov: false,
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
        case "send-today":
        case "makeup":
          throw new Error(
            "Reminder cohorts missing for a due Gregorian schedule",
          );
        default:
          return assertNever(fallbackResolution);
      }
    }

    const cohortContext = dueCohorts.map(describeCohort).join("; ");
    console.log(
      `[REMINDER] Due calendar cohorts on ${currentIsraelDate}: ${cohortContext || "none"}`,
    );

    const cohortUsers = dueCohorts.length === 0
      ? []
      : await Promise.all(
        dueCohorts.map((cohort) =>
          userService.getUsersWithTitheBalances(
            cohort.reminderDay,
            cohort.calendarType,
          )
        ),
      );
    const usersWithBalances = deduplicateReminderUsers(cohortUsers.flat());
    const primaryResolution = dueCohorts[0]?.resolution ?? yearlyResolution;

    if (usersWithBalances.length === 0 && !yearlyDue) {
      await logRun(supabaseAdmin, {
        ...buildReminderRunLog(currentIsraelDate, primaryResolution),
        notes:
          `No users configured for due cohorts [${cohortContext}]${isTest ? " (TEST)" : ""}`,
      });
      return new Response(
        JSON.stringify({
          message:
            `No users found for due reminder cohorts [${cohortContext}]${isTest ? " (TEST MODE)" : ""}`,
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

    const results = usersWithBalances.length === 0
      ? []
      : [...await emailService.sendBulkReminders(usersWithBalances)];
    const sentMonthlyIds = new Set(usersWithBalances.map((user) => user.id));

    if (usersWithBalances.length > 0) {
      console.log(
        `[REMINDER] Starting to send emails to ${usersWithBalances.length} unique users for [${cohortContext}]${isTest ? " (TEST MODE)" : ""}`,
      );
    }

    let yearlySent = 0;
    let yearlyFailed = 0;
    let yearlyProcessed = 0;
    if (yearlyDue) {
      const yearlyUsers = (await userService.getAllUsersWithTitheBalances())
        .filter((user) => !sentMonthlyIds.has(user.id));
      yearlyProcessed = yearlyUsers.length;
      if (yearlyUsers.length > 0) {
        const yearlyResults = await emailService.sendBulkReminders(yearlyUsers);
        yearlySent = yearlyResults.filter((result) => result.status === "sent").length;
        yearlyFailed = yearlyResults.filter((result) => result.status === "failed").length;
        results.push(...yearlyResults);
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;
    console.log(
      `[REMINDER] Email sending completed: ${sentCount} sent, ${failedCount} failed`,
    );

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

    const yearlyNote = yearlyDue
      ? `; maaser-year-close=${yearlyResolution.kind}:${yearlyProcessed}/${yearlySent}/${yearlyFailed}`
      : "";
    await logRun(supabaseAdmin, {
      ...buildReminderRunLog(currentIsraelDate, primaryResolution, {
        usersProcessed: usersWithBalances.length + yearlyProcessed,
        emailsSent: sentCount,
        emailsFailed: failedCount,
      }),
      notes: `${isTest ? "TEST MODE; " : ""}cohorts=[${cohortContext || "none"}]${yearlyNote}`,
    });

    return new Response(
      JSON.stringify({
        message:
          `Processed ${usersWithBalances.length + yearlyProcessed} unique users for [${cohortContext || "none"}]${yearlyDue ? "; maaser-year-close" : ""}${isTest ? " (TEST MODE)" : ""}. Sent: ${sentCount}, Failed: ${failedCount}`,
        results,
        was_yom_tov: false,
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
