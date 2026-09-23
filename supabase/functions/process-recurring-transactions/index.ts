import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getIsraelDate } from "../_shared/israel-date.ts";
import { advanceRecurringDate } from "../_shared/calendar/index.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const validAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const validServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Multi-provider exchange rate fetching (same priority as frontend)
interface RateProvider {
  name: string;
  buildUrl: (from: string, to: string) => string;
  parseRate: (data: unknown, from: string, to: string) => number | null;
}

const RATE_PROVIDERS: RateProvider[] = [
  {
    // 1st Priority: ExchangeRate-API (free tier)
    name: "exchangerate-api",
    buildUrl: (from) => `https://api.exchangerate-api.com/v4/latest/${from}`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as { rates?: Record<string, number> };
      return d.rates?.[to] ?? null;
    },
  },
  {
    // 2nd Priority: Frankfurter (ECB rates)
    name: "frankfurter",
    buildUrl: (from, to) =>
      `https://api.frankfurter.app/latest?from=${from}&symbols=${to}`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as { rates?: Record<string, number> };
      return d.rates?.[to] ?? null;
    },
  },
  {
    // 3rd Priority: FloatRates (free, reliable, daily updates)
    name: "floatrates",
    buildUrl: (from) =>
      `https://www.floatrates.com/daily/${from.toLowerCase()}.json`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as Record<string, { rate?: number }>;
      const key = to.toLowerCase();
      return d[key]?.rate ?? null;
    },
  },
];

async function fetchExchangeRate(
  from: string,
  to: string
): Promise<number | null> {
  for (const provider of RATE_PROVIDERS) {
    try {
      console.log(`Trying provider "${provider.name}" for ${from} -> ${to}`);
      const url = provider.buildUrl(from, to);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${provider.name} returned ${response.status}`);
      }

      const data = await response.json();
      const rate = provider.parseRate(data, from, to);

      if (rate == null) {
        throw new Error(
          `${provider.name}: Rate not found for ${from} -> ${to}`
        );
      }

      // Round rate to 4 decimal places
      const roundedRate = Math.round(rate * 10000) / 10000;
      console.log(
        `Got rate from "${provider.name}": ${from} -> ${to} = ${roundedRate}`
      );
      return roundedRate;
    } catch (error) {
      console.warn(`Provider "${provider.name}" failed:`, error);
      // Continue to next provider
    }
  }

  console.error(`All providers failed for ${from} -> ${to}`);
  return null;
}

Deno.serve(async (req) => {
  // Security: Check for valid authorization
  const authorization = req.headers.get("Authorization");

  if (!authorization || !authorization.includes("Bearer")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized - Missing Bearer token" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Extract token from "Bearer TOKEN" format
  const token = authorization.replace("Bearer ", "");

  // Check if token is API key (sb_publishable_... or sb_secret_...)
  const isApiKey =
    token.startsWith("sb_publishable_") || token.startsWith("sb_secret_");

  // If it's an API key, validate against known keys
  if (isApiKey) {
    const tokenMatchesAnon = token === validAnonKey;
    const tokenMatchesService = token === validServiceKey;

    if (!tokenMatchesAnon && !tokenMatchesService) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    // If it's a JWT token, validate it with Supabase
    try {
      // Decode JWT to check role first (quick check)
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const tokenData = JSON.parse(atob(tokenParts[1])) as {
        role?: string;
        exp?: number;
      };

      // Check expiration first
      if (tokenData.exp && tokenData.exp < Date.now() / 1000) {
        return new Response(JSON.stringify({ error: "Token expired" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      // For service_role tokens, verify by attempting to use it with Supabase
      // We create a client with the token as Authorization header to verify it's valid
      if (tokenData.role === "service_role") {
        // Verify token by creating a client with the token and making a simple request
        // If token is invalid, Supabase will reject it
        const testClient = createClient(supabaseUrl, validAnonKey ?? "", {
          global: { headers: { Authorization: authorization } },
        });

        // Try to make a simple request - if token is invalid, this will fail
        const { error: testError } = await testClient
          .from("recurring_transactions")
          .select("id")
          .limit(1);

        if (testError) {
          // If error is related to JWT/auth, token is invalid
          if (
            testError.message.includes("JWT") ||
            testError.message.includes("token") ||
            testError.message.includes("auth")
          ) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }
          // Other errors (like network) are OK - token itself is valid
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Invalid token - requires service_role" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    console.log("Starting process-recurring-transactions...");

    // 1. Fetch due recurring transactions
    const today = getIsraelDate();
    const { data: dueTransactions, error: fetchError } = await supabase
      .from("recurring_transactions")
      .select(
        "id,user_id,status,start_date,next_due_date,frequency,calendar_type,anchor_month_code,day_of_month,total_occurrences,execution_count,description,amount,currency,type,category,is_chomesh,recipient,payment_method,original_amount,original_currency,conversion_rate,conversion_date,rate_source",
      )
      .eq("status", "active")
      .lte("next_due_date", today);

    if (fetchError) throw fetchError;

    if (!dueTransactions || dueTransactions.length === 0) {
      console.log("No due transactions found.");
      return new Response(JSON.stringify({ message: "No due transactions" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${dueTransactions.length} due recurring definitions.`);
    const results: { id: string; status: string }[] = [];
    let skippedCount = 0;

    // Cache fetched rates per invocation to avoid redundant API calls
    // during catch-up loops (e.g. 6 missed months = 1 API call instead of 6).
    // Only successful (non-null) rates are cached so transient failures are retried.
    const rateCache = new Map<string, number>();
    const fetchExchangeRateCached = async (from: string, to: string) => {
      const key = `${from}:${to}`;
      if (rateCache.has(key)) return rateCache.get(key)!;
      const rate = await fetchExchangeRate(from, to);
      if (rate !== null) {
        rateCache.set(key, rate);
      }
      return rate;
    };

    // 2. Process each transaction definition
    for (const rec of dueTransactions) {
      try {
        // Get user profile for default currency (Optimization: fetch once per definition)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("default_currency")
          .eq("id", rec.user_id)
          .single();

        if (profileError && profileError.code !== "PGRST116") {
          console.error(
            `Error fetching profile for user ${rec.user_id}:`,
            profileError
          );
          continue;
        }

        const defaultCurrency = profile?.default_currency || "ILS";

        // Loop variables
        let currentDueDate = rec.next_due_date;
        let executionCount = rec.execution_count;
        let currentStatus = rec.status;
        let processedOccurrences = 0;
        const recCurrency = rec.currency; // stable for all iterations

        // Catch-up Loop: Process all missed occurrences up to today
        while (
          currentDueDate <= today &&
          currentStatus === "active"
        ) {
          const currentDueDateStr = currentDueDate;

          console.log(
            `Processing occurrence for ${rec.id} due on ${currentDueDateStr}`
          );
          let finalAmount = rec.amount;
          let finalCurrency = defaultCurrency;
          let originalAmount: number | null = null;
          let originalCurrency: string | null = null;
          let conversionRate: number | null = null;
          let conversionDate: string | null = null;
          let rateSource: string | null = null;

          // Check conversion logic
          let shouldInsert = true;
          const occurrenceNumber = executionCount + 1;
          const { data: existingOccurrence, error: existingOccurrenceError } =
            await supabase
              .from("transactions")
              .select("id")
              .eq("source_recurring_id", rec.id)
              .eq("occurrence_number", occurrenceNumber)
              .maybeSingle();

          if (existingOccurrenceError) {
            throw existingOccurrenceError;
          }
          if (existingOccurrence) {
            shouldInsert = false;
            processedOccurrences++;
          }

          if (
            shouldInsert &&
            rec.original_amount != null &&
            rec.original_currency != null
          ) {
            if (rec.rate_source === "manual") {
              // MANUAL RATE: Always use the stored rate - user explicitly set it
              finalAmount = rec.amount;
              finalCurrency = recCurrency; // rec.currency = the currency amount was converted into at creation
              originalAmount = rec.original_amount;
              originalCurrency = rec.original_currency;
              conversionRate = rec.conversion_rate;
              conversionDate = rec.conversion_date;
              rateSource = "manual";
            } else {
              // AUTO RATE: Try to get a fresh rate, fallback to stored rate.
              // Rate is cached per (from,to) pair for this invocation to avoid
              // redundant API calls during catch-up loops.
              const freshRate = await fetchExchangeRateCached(
                rec.original_currency,
                defaultCurrency
              );
              if (freshRate != null) {
                finalAmount = Number(
                  (rec.original_amount * freshRate).toFixed(2)
                );
                finalCurrency = defaultCurrency;
                originalAmount = rec.original_amount;
                originalCurrency = rec.original_currency;
                conversionRate = freshRate;
                conversionDate = today;
                rateSource = "auto";
                console.log(
                  `Using FRESH rate for ${rec.id}: ${rec.original_amount} ${rec.original_currency} -> ${finalAmount} ${defaultCurrency} (Rate: ${freshRate})`
                );
              } else {
                // Fallback to stored rate from creation time
                console.warn(
                  `No fresh rate available for ${rec.id}, falling back to stored rate`
                );
                finalAmount = rec.amount;
                finalCurrency = recCurrency; // rec.currency = the currency amount was converted into at creation
                originalAmount = rec.original_amount;
                originalCurrency = rec.original_currency;
                conversionRate = rec.conversion_rate;
                conversionDate = rec.conversion_date;
                rateSource = "auto";
              }
            }
          } else if (shouldInsert && recCurrency !== defaultCurrency) {
            // Legacy / Foreign currency without stored conversion
            const rate = await fetchExchangeRateCached(recCurrency, defaultCurrency);

            if (rate != null) {
              finalAmount = Number((rec.amount * rate).toFixed(2));
              originalAmount = rec.amount;
              originalCurrency = recCurrency;
              conversionRate = rate;
              conversionDate = today;
              rateSource = "auto";
            } else {
              console.error(
                `[RETRY-PENDING] Legacy recurring ${rec.id}: All rate providers failed. Skipping this occurrence.`
              );
              skippedCount++;
              shouldInsert = false; // Skip insertion but allow loop to advance
            }
          } else {
            finalCurrency = defaultCurrency;
          }

          // Insert transaction
          if (shouldInsert) {
            const { error: insertError } = await supabase
              .from("transactions")
              .insert({
                user_id: rec.user_id,
                date: currentDueDateStr,
                amount: finalAmount,
                currency: finalCurrency,
                description: rec.description,
                type: rec.type,
                category: rec.category,
                is_chomesh: rec.is_chomesh,
                recipient: rec.recipient,
                payment_method: rec.payment_method,
                source_recurring_id: rec.id,
                occurrence_number: occurrenceNumber,
                original_amount: originalAmount,
                original_currency: originalCurrency,
                conversion_rate: conversionRate,
                conversion_date: conversionDate,
                rate_source: rateSource,
              });

            if (insertError) {
              console.error(
                `[RETRY-PENDING] Recurring ${rec.id}: Insert failed. Error:`,
                insertError
              );
              skippedCount++;
              // If insert failed (e.g. DB error), we skip counting it as processed.
              // The loop will still advance executionCount and the due date below,
              // which prevents an infinite loop on this item.
            } else {
              // Advance state only on success or intended skip
              processedOccurrences++;
            }
          }

          executionCount++;

          currentDueDate = advanceRecurringDate(currentDueDateStr, {
            calendarType: rec.calendar_type ?? "gregorian",
            frequency: rec.frequency,
            dayOfMonth: rec.day_of_month,
            anchorMonthCode: rec.anchor_month_code,
            yearlyNormalization: "constrain",
          });

          // Check completion
          if (
            rec.total_occurrences &&
            executionCount >= rec.total_occurrences
          ) {
            currentStatus = "completed";
          }
        }

        // Update recurring transaction definition (Always update if we entered the loop/advanced state)
        // We check if executionCount changed to know if we did anything
        if (executionCount > rec.execution_count) {
          const finalNextDueDate = currentDueDate;

          const { error: updateError } = await supabase
            .from("recurring_transactions")
            .update({
              execution_count: executionCount,
              next_due_date: finalNextDueDate,
              status: currentStatus,
            })
            .eq("id", rec.id);

          if (updateError) {
            console.error(
              `Error updating recurring transaction ${rec.id}:`,
              updateError
            );
          } else {
            results.push({
              id: rec.id,
              status: `processed_${processedOccurrences}_advanced_to_${finalNextDueDate}`,
            });
          }
        }
      } catch (innerErr) {
        console.error(
          `Error processing recurring transaction ${rec.id}:`,
          innerErr
        );
      }
    }

    // Summary log for monitoring
    console.log(
      `[SUMMARY] Processed: ${results.length} definitions, Skipped (will retry): ${skippedCount}, Total due definitions: ${dueTransactions.length}`
    );

    return new Response(
      JSON.stringify({
        processed: results.length,
        skipped: skippedCount,
        details: results,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Fatal error in process-recurring-transactions:", err);
    return new Response(String(err), { status: 500 });
  }
});
