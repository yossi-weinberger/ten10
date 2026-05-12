import type { ImportPreviewRow, ImportResult } from "./import-session.types";
import type { Platform } from "@/contexts/PlatformContext";
import type { Currency, Transaction } from "@/types/transaction";
import { useDonationStore } from "@/lib/store";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import { clearCategoryCache } from "@/lib/data-layer/categories.service";
import { clearPaymentMethodCache } from "@/lib/data-layer/paymentMethods.service";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { WEB_IMPORT_BATCH_SIZE } from "@/lib/data-layer/dataManagement/importPrepare";
import { nanoid } from "nanoid";

/** Fields needed for deduplication — minimal fetch. */
const DEDUP_FIELDS = "date,amount,currency,type,description,category";

/**
 * Fetch existing transactions with only the fields needed for duplicate detection.
 * Returns an empty array on any error so dedup degrades gracefully.
 */
export async function fetchExistingForDedup(platform: Platform): Promise<Transaction[]> {
  try {
    if (platform === "web") {
      const { data, error } = await supabase
        .from("transactions")
        .select(DEDUP_FIELDS);
      if (error) throw error;
      return (data ?? []) as unknown as Transaction[];
    } else if (platform === "desktop") {
      const { invoke } = await import("@tauri-apps/api/core");
      const transactions = await invoke<Transaction[]>("export_transactions_handler", {
        filters: {},
      });
      return transactions ?? [];
    }
  } catch (err) {
    logger.warn("fetchExistingForDedup: could not fetch existing transactions:", err);
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
    throw new Error("User not authenticated");
  }

  const approved = getApprovedRows(rows);
  let inserted = 0;
  const errors: string[] = [];

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
      errors.push("Failed to save row");
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

  await invoke("import_desktop_data_bulk", {
    mode: "merge",
    recurring: [],
    transactions,
  });

  return {
    inserted: transactions.length,
    failed: 0,
    skipped: rows.length - approved.length,
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Post-import cache/store refresh
// ---------------------------------------------------------------------------

function refreshAfterImport(
  platform: Platform,
  rows: ImportPreviewRow[]
): void {
  // Trigger stats refresh
  useDonationStore.getState().setLastDbFetchTimestamp(Date.now());

  // Refresh paginated transaction table
  useTableTransactionsStore.getState().fetchTransactions(true, platform);

  // Determine if any new categories were introduced
  const hasNewCategories = rows.some(
    (r) => r.approved && r.normalized?.category
  );
  if (hasNewCategories) {
    clearCategoryCache();
  }

  // Determine if any new payment methods were introduced
  const hasNewPaymentMethods = rows.some(
    (r) => r.approved && r.normalized?.payment_method
  );
  if (hasNewPaymentMethods) {
    clearPaymentMethodCache();
  }
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
    throw new Error("Platform not ready");
  }

  if (result.inserted > 0) {
    refreshAfterImport(platform, rows);
  }

  return result;
}
