import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    buildUrl: (from, to) => `https://api.frankfurter.app/latest?from=${from}&symbols=${to}`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as { rates?: Record<string, number> };
      return d.rates?.[to] ?? null;
    },
  },
  {
    // 3rd Priority: FloatRates (free, reliable, daily updates)
    name: "floatrates",
    buildUrl: (from) => `https://www.floatrates.com/daily/${from.toLowerCase()}.json`,
    parseRate: (data: unknown, _from, to) => {
      const d = data as Record<string, { rate?: number }>;
      const key = to.toLowerCase();
      return d[key]?.rate ?? null;
    },
  },
];

async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
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
      
      if (!rate) {
        throw new Error(`${provider.name}: Rate not found for ${from} -> ${to}`);
      }
      
      // Round rate to 4 decimal places
      const roundedRate = Math.round(rate * 10000) / 10000;
      console.log(`Got rate from "${provider.name}": ${from} -> ${to} = ${roundedRate}`);
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
  try {
    console.log("Starting process-recurring-transactions...");

    // 1. Fetch due recurring transactions
    const today = new Date().toISOString().split("T")[0];
    const { data: dueTransactions, error: fetchError } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("status", "active")
      .lte("next_due_date", today);

    if (fetchError) throw fetchError;
    
    if (!dueTransactions || dueTransactions.length === 0) {
      console.log("No due transactions found.");
      return new Response(JSON.stringify({ message: "No due transactions" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${dueTransactions.length} due transactions.`);
    const results: { id: string; status: string }[] = [];
    let skippedCount = 0;

    // 2. Process each transaction
    for (const rec of dueTransactions) {
      try {
        // Get user profile for default currency
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("default_currency")
          .eq("id", rec.user_id)
          .single();

        if (profileError && profileError.code !== "PGRST116") { // Ignore 'row not found' (user might be deleted?)
             console.error(`Error fetching profile for user ${rec.user_id}:`, profileError);
             continue;
        }

        const defaultCurrency = profile?.default_currency || "ILS";
        const recCurrency = rec.currency; // rec.currency should already be defaultCurrency if converted at form
        
        let finalAmount = rec.amount;
        let finalCurrency = defaultCurrency;
        let originalAmount = null;
        let originalCurrency = null;
        let conversionRate = null;
        let conversionDate = null;
        let rateSource = null;

        // Check if the recurring transaction already has conversion details stored
        // (i.e., it was created with a locked-in rate from the form)
        if (rec.original_amount && rec.original_currency) {
          // Use the pre-calculated conversion data
          // Per Base Currency Architecture: rec.currency is already the default currency (converted at form submission)
          // and rec.original_currency contains the foreign currency
          console.log(`Using stored conversion for recurring ${rec.id}`);
          finalAmount = rec.amount; // Already converted to default currency
          finalCurrency = defaultCurrency; // Use defaultCurrency explicitly for clarity
          originalAmount = rec.original_amount;
          originalCurrency = rec.original_currency;
          conversionRate = rec.conversion_rate;
          conversionDate = rec.conversion_date;
          rateSource = rec.rate_source;
        } else if (recCurrency !== defaultCurrency) {
          // LEGACY: Recurring transaction in foreign currency without stored conversion
          // This should only happen for old data created before currency conversion feature
          console.log(`Fetching rate for ${recCurrency} -> ${defaultCurrency}`);
          const rate = await fetchExchangeRate(recCurrency, defaultCurrency);
          
          if (rate) {
            finalAmount = Number((rec.amount * rate).toFixed(2));
            originalAmount = rec.amount;
            originalCurrency = recCurrency;
            conversionRate = rate;
            conversionDate = today;
            rateSource = "auto";
          } else {
            // LEGACY TRANSACTION: No stored rate, all APIs failed
            // This will retry on next cron run (typically tomorrow)
            // This should be rare - only affects old transactions created before currency conversion feature
            console.error(`[RETRY-PENDING] Legacy recurring ${rec.id}: All rate providers failed for ${recCurrency} -> ${defaultCurrency}. Will retry on next cron run.`);
            skippedCount++;
            continue;
          }
        } else {
            // Same currency
            finalCurrency = defaultCurrency;
        }

        // Insert transaction
        const { error: insertError } = await supabase.from("transactions").insert({
          user_id: rec.user_id,
          date: rec.next_due_date,
          amount: finalAmount,
          currency: finalCurrency,
          description: rec.description,
          type: rec.type,
          category: rec.category,
          is_chomesh: rec.is_chomesh,
          recipient: rec.recipient,
          source_recurring_id: rec.id,
          occurrence_number: rec.execution_count + 1,
          original_amount: originalAmount,
          original_currency: originalCurrency,
          conversion_rate: conversionRate,
          conversion_date: conversionDate,
          rate_source: rateSource,
        });

        if (insertError) {
          // INSERT FAILED: This will retry on next cron run
          // Common causes: constraint violation, permissions issue, or transient DB error
          console.error(`[RETRY-PENDING] Recurring ${rec.id}: Insert failed. Will retry on next cron run. Error:`, insertError);
          skippedCount++;
          continue;
        }

        // Update recurring transaction
        let nextDueDateObj = new Date(rec.next_due_date);
        
        // Calculate next date (simple implementation)
        if (rec.frequency === 'monthly') {
            const currentMonth = nextDueDateObj.getMonth();
            nextDueDateObj.setMonth(currentMonth + 1);
            // Handle overflow (e.g. Jan 31 -> Feb 28/29)
            // If the day changed, it means we overflowed. 
            // We should stick to `day_of_month` if possible, but JS Date auto-adjusts.
            // Ideally we should use the stored `day_of_month` to reset the day if it's valid for the new month.
            // But let's keep it simple as JS logic:
            if (rec.day_of_month) {
                // Try to set to the preferred day
                const year = nextDueDateObj.getFullYear();
                const month = nextDueDateObj.getMonth(); // This is the NEW month
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                nextDueDateObj.setDate(Math.min(rec.day_of_month, daysInMonth));
            }
        } else if (rec.frequency === 'weekly') {
            nextDueDateObj.setDate(nextDueDateObj.getDate() + 7);
        } else if (rec.frequency === 'yearly') {
            nextDueDateObj.setFullYear(nextDueDateObj.getFullYear() + 1);
        } else if (rec.frequency === 'daily') {
            nextDueDateObj.setDate(nextDueDateObj.getDate() + 1);
        }
        
        const newNextDueDate = nextDueDateObj.toISOString().split('T')[0];
        const newExecutionCount = rec.execution_count + 1;
        const newStatus = (rec.total_occurrences && newExecutionCount >= rec.total_occurrences) ? 'completed' : 'active';

        const { error: updateError } = await supabase.from("recurring_transactions").update({
          execution_count: newExecutionCount,
          next_due_date: newNextDueDate,
          status: newStatus
        }).eq("id", rec.id);

        if (updateError) {
             console.error(`Error updating recurring transaction ${rec.id}:`, updateError);
        } else {
            results.push({ id: rec.id, status: "processed" });
        }

      } catch (innerErr) {
          console.error(`Error processing recurring transaction ${rec.id}:`, innerErr);
      }
    }

    // Summary log for monitoring
    console.log(`[SUMMARY] Processed: ${results.length}, Skipped (will retry): ${skippedCount}, Total due: ${dueTransactions.length}`);
    
    return new Response(JSON.stringify({ 
      processed: results.length, 
      skipped: skippedCount,
      details: results 
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Fatal error in process-recurring-transactions:", err);
    return new Response(String(err), { status: 500 });
  }
});
