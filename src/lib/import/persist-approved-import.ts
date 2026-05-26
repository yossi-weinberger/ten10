import type { ImportPreviewRow, ImportResult, ImportResultError } from "./import-session.types";
import type { Platform } from "@/contexts/PlatformContext";
import type { Currency, Transaction, RecurringTransaction } from "@/types/transaction";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { WEB_IMPORT_BATCH_SIZE } from "@/lib/data-layer/dataManagement/importPrepare";
import { nanoid } from "nanoid";

/** Fields needed for deduplication — minimal fetch. */
const DEDUP_FIELDS = "date,amount,currency,type,description,category";

/** Fields needed for recurring-warning detection — minimal fetch. */
const RECURRING_FIELDS = "id,status,currency,type,amount,frequency,day_of_month,description";

type ImportDateRange = { from: string; to: string };

/**
 * Fetch existing transactions with only the fields needed for duplicate detection.
 * Returns an empty array on any error so dedup degrades gracefully.
 */
export async function fetchExistingForDedup(
  platform: Platform,
  dateRange?: ImportDateRange | null
): Promise<Transaction[]> {
  try {
    if (platform === "web") {
      let query = supabase
        .from("transactions")
        .select(DEDUP_FIELDS);

      if (dateRange) {
        query = query.gte("date", dateRange.from).lte("date", dateRange.to);
      }

      // Limit to 5000 rows; Supabase default is 1000 which silently truncates.
      // If the result hits this cap, dedup coverage is incomplete — log a warning.
      const { data, error } = await query.limit(5000);
      if (data && data.length >= 5000) {
        logger.warn("fetchExistingForDedup: result may be truncated at 5000 rows — dedup coverage may be incomplete");
      }
      if (error) throw error;
      return (data ?? []) as unknown as Transaction[];
    } else if (platform === "desktop") {
      const { invoke } = await import("@tauri-apps/api/core");
      const transactions = await invoke<Transaction[]>("export_transactions_handler", {
        filters: {
          search: null,
          date_from: dateRange?.from ?? null,
          date_to: dateRange?.to ?? null,
          types: null,
          payment_methods: null,
          show_only: null,
          recurring_statuses: null,
          recurring_frequencies: null,
        },
      });
      return transactions ?? [];
    }
  } catch (err) {
    logger.warn("fetchExistingForDedup: could not fetch existing transactions:", err);
  }
  return [];
}

/**
 * Fetch recurring definitions that can trigger import review warnings.
 * Returns an empty array on any error so recurring detection degrades gracefully.
 */
export async function fetchRecurringForImport(
  platform: Platform
): Promise<RecurringTransaction[]> {
  try {
    if (platform === "web") {
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select(RECURRING_FIELDS)
        .in("status", ["active", "paused"]);
      if (error) throw error;
      return (data ?? []) as RecurringTransaction[];
    } else if (platform === "desktop") {
      const { invoke } = await import("@tauri-apps/api/core");
      const recurring = await invoke<RecurringTransaction[]>(
        "get_recurring_transactions_handler",
        {
          args: {
            sorting: { field: "next_due_date", direction: "asc" },
            filters: {
              search: null,
              statuses: ["active", "paused"],
              types: null,
              date_from: null,
              date_to: null,
              frequencies: null,
            },
          },
        }
      );
      return recurring ?? [];
    }
  } catch (err) {
    logger.warn("fetchRecurringForImport: could not fetch recurring transactions:", err);
  }
  return [];
}

/** Only approved, non-invalid rows with a normalized value. */
function getApprovedRows(rows: ImportPreviewRow[]): ImportPreviewRow[] {
  return rows.filter(
    (r) => r.approved && r.status !== "invalid" && r.normalized
  );
}

// ---------------------------------------------------------------------------
// Web persistence
// ---------------------------------------------------------------------------

async function persistWeb(
  rows: ImportPreviewRow[],
  defaultCurrency: Currency
): Promise<ImportResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      inserted: 0,
      failed: getApprovedRows(rows).length,
      skipped: rows.length - getApprovedRows(rows).length,
      errors: [{ code: "save_auth_failed", detail: userError?.message }],
    };
  }

  const approved = getApprovedRows(rows);
  let inserted = 0;
  const errors: ImportResultError[] = [];

  // Build insert payloads
  const payloads = approved.map((row) => {
    const n = row.normalized!;
    return {
      user_id: user.id,
      date: n.date,
      amount: n.amount,
      currency: n.currency ?? defaultCurrency,
      description: n.description,
      type: n.type,
      category: n.category,
      recipient: n.recipient,
      payment_method: n.payment_method,
      is_chomesh: n.is_chomesh,
      original_amount: null,
      original_currency: null,
      conversion_rate: null,
      conversion_date: null,
      rate_source: null,
      source_recurring_id: null,
    };
  });

  // Insert in batches
  for (let offset = 0; offset < payloads.length; offset += WEB_IMPORT_BATCH_SIZE) {
    const batch = payloads.slice(offset, offset + WEB_IMPORT_BATCH_SIZE);
    const { error: batchError } = await supabase.from("transactions").insert(batch);

    if (batchError) {
      logger.error("Import batch insert error:", batchError);
      errors.push({ code: "save_batch_failed", detail: batchError.message });
      // Report partial result
      return {
        inserted,
        failed: approved.length - inserted,
        skipped: rows.length - approved.length,
        errors,
      };
    }

    inserted += batch.length;
  }

  return {
    inserted,
    failed: 0,
    skipped: rows.length - approved.length,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Desktop persistence
// ---------------------------------------------------------------------------

async function persistDesktop(rows: ImportPreviewRow[]): Promise<ImportResult> {
  const { invoke } = await import("@tauri-apps/api/core");

  const approved = getApprovedRows(rows);

  const transactions = approved.map((row) => {
    const n = row.normalized!;
    const now = new Date().toISOString();
    return {
      id: nanoid(),
      user_id: undefined,
      date: n.date,
      amount: n.amount,
      currency: n.currency,
      description: n.description ?? null,
      type: n.type,
      category: n.category ?? null,
      recipient: n.recipient ?? null,
      payment_method: n.payment_method ?? null,
      is_chomesh: n.is_chomesh,
      original_amount: null,
      original_currency: null,
      conversion_rate: null,
      conversion_date: null,
      rate_source: null,
      source_recurring_id: null,
      occurrence_number: null,
      created_at: now,
      updated_at: now,
    };
  });

  try {
    await invoke("import_desktop_data_bulk", {
      mode: "merge",
      recurring: [],
      transactions,
    });
  } catch (err) {
    logger.error("Desktop import failed:", err);
    return {
      inserted: 0,
      failed: transactions.length,
      skipped: rows.length - approved.length,
      errors: [{
        code: "save_desktop_failed",
        detail: err instanceof Error ? err.message : String(err),
      }],
    };
  }

  return {
    inserted: transactions.length,
    failed: 0,
    skipped: rows.length - approved.length,
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function persistApprovedImport(
  rows: ImportPreviewRow[],
  platform: Platform,
  defaultCurrency: Currency
): Promise<ImportResult> {
  let result: ImportResult;

  if (platform === "web") {
    result = await persistWeb(rows, defaultCurrency);
  } else if (platform === "desktop") {
    result = await persistDesktop(rows);
  } else {
    const approvedCount = rows.filter((r) => r.approved).length;
    return {
      inserted: 0,
      failed: approvedCount,
      skipped: rows.length - approvedCount,
      errors: [{ code: "platform_not_ready" }],
    };
  }

  return result;
}
