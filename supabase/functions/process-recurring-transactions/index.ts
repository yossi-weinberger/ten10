import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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
    const results = [];

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
        const sourceCurrency = rec.currency;
        
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
          console.log(`Using stored conversion for recurring ${rec.id}`);
          finalAmount = rec.amount; // Already converted to default currency
          finalCurrency = sourceCurrency; // Should be default currency (ILS)
          originalAmount = rec.original_amount;
          originalCurrency = rec.original_currency;
          conversionRate = rec.conversion_rate;
          conversionDate = rec.conversion_date;
          rateSource = rec.rate_source;
        } else if (sourceCurrency !== defaultCurrency) {
          // Fetch rate
          try {
            console.log(`Fetching rate for ${sourceCurrency} -> ${defaultCurrency}`);
            const rateRes = await fetch(`https://api.exchangerate-api.com/v4/latest/${sourceCurrency}`);
            
            if (rateRes.ok) {
              const rateData = await rateRes.json();
              const rate = rateData.rates[defaultCurrency];
              if (rate) {
                finalAmount = Number((rec.amount * rate).toFixed(2));
                originalAmount = rec.amount;
                originalCurrency = sourceCurrency;
                conversionRate = rate;
                conversionDate = today;
                rateSource = "auto";
              } else {
                  throw new Error(`Rate not found in API response`);
              }
            } else {
                throw new Error(`API returned ${rateRes.status}`);
            }
          } catch (e) {
            console.error(`Failed to fetch rate for ${sourceCurrency} -> ${defaultCurrency}`, e);
            // Skip processing this transaction for now to avoid bad data
            // Or maybe retry logic could be implemented here?
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
          console.error(`Error inserting transaction for recurring ${rec.id}:`, insertError);
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

    return new Response(JSON.stringify({ processed: results }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Fatal error in process-recurring-transactions:", err);
    return new Response(String(err), { status: 500 });
  }
});
