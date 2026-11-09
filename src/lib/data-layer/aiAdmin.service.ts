import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import type { IntakeDraftCounts } from "@/lib/admin/ai-intake-funnel";
import type { AiBucketGrain } from "../../../supabase/functions/_shared/ai/admin-buckets.ts";

export type AdminAiBucket = {
  bucket: string;
  committed: number;
  rejected: number;
  reverted: number;
  drafts: number;
  text: number;
  receipt: number;
  speech: number;
};

export type AdminAiUsage = {
  ai_transactions: number;
  ai_auto_transactions: number;
  all_transactions: number;
  ai_transaction_users: number;
  ai_users: number;
  message_senders: number;
  ai_recurring: number;
};

export type AdminAiCounts = {
  from: string;
  to: string;
  grain: AiBucketGrain;
  first_on: string | null;
  drafts: IntakeDraftCounts;
  messages_by_kind: Record<string, number>;
  origins: { ai: number; ai_auto: number };
  receipt_links: number;
  artifacts: { active: number; deleted: number };
  rules_active: number;
  questions: number;
  question_outcomes: Record<string, number>;
  buckets: AdminAiBucket[];
  usage: AdminAiUsage;
  users: Array<{ email: string; drafts: number; committed: number; questions: number }>;
};

export type AdminAiSpendDay = { day: string; totalCost: number; requestCount: number };

export type AdminAiSpend = {
  available: boolean;
  mixed: boolean;
  models: Array<{ label: string; totalCost: number; requestCount: number; inputTokens: number; outputTokens: number }>;
  appDays: AdminAiSpendDay[];
  sources: { app: number; eval: number };
};

export type AdminAiCallOperation = {
  operation: string;
  calls: number;
  failed: number;
  p50_ms: number;
  p95_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  top_error: string | null;
};

export type AdminAiCalls = {
  first_on: string | null;
  operations: AdminAiCallOperation[];
  days: Array<{ day: string; calls: number; cost_usd: number }>;
  model_buckets: Array<{ bucket: string; model: string; calls: number; cost_usd: number }>;
  users: Array<{ email: string; calls: number; failed: number; cost_usd: number }>;
};

export type AdminUserPlan = {
  user_email: string;
  user_id: string;
  plan: string;
  source: "manual" | "billing";
  expires_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPlan = {
  plan: string;
  ai_monthly_units: number;
  ai_daily_calls: number;
  ai_minute_calls: number;
  is_default: boolean;
};

/** The gateway bills every report query, so a range is fetched once per page load. */
const spendCache = new Map<string, AdminAiSpend>();

export async function fetchAdminAiCounts(from: string, to: string): Promise<AdminAiCounts | null> {
  const { data, error } = await supabase.rpc("get_admin_ai_stats", {
    p_from: from,
    p_to: to,
  });
  if (error) {
    logger.error("Admin AI counts failed", error);
    return null;
  }
  return data as AdminAiCounts;
}

export async function fetchAdminAiCalls(from: string, to: string): Promise<AdminAiCalls | null> {
  const { data, error } = await supabase.rpc("get_admin_ai_calls", {
    p_from: from,
    p_to: to,
  });
  if (error) {
    logger.error("Admin AI calls failed", error);
    return null;
  }
  return data as AdminAiCalls;
}

export async function fetchAdminAiSpend(from: string, to: string): Promise<AdminAiSpend | null> {
  const key = `${from}|${to}`;
  const cached = spendCache.get(key);
  if (cached) return cached;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!accessToken || !supabaseUrl) return null;
    const response = await fetch(
      `${supabaseUrl}/functions/v1/get-ai-admin-spend?from=${from}&to=${to}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    if (!response.ok) {
      logger.error("Admin AI spend failed", response.status);
      return null;
    }
    const spend = (await response.json()) as AdminAiSpend;
    if (spend.available) spendCache.set(key, spend);
    return spend;
  } catch (error) {
    logger.error("Admin AI spend failed", error);
    return null;
  }
}

export async function fetchUserPlans(): Promise<AdminUserPlan[]> {
  const { data, error } = await supabase.rpc("admin_list_user_plans");
  if (error) {
    logger.error("Fetch user plans failed", error);
    throw error;
  }
  return (data || []) as AdminUserPlan[];
}

export async function fetchPlans(): Promise<AdminPlan[]> {
  const { data, error } = await supabase.from("plans").select("*").order("plan");
  if (error) {
    logger.error("Fetch plans failed", error);
    throw error;
  }
  return (data || []) as AdminPlan[];
}

export async function addUserPlan(
  email: string,
  plan: string,
  expiresOn: string | null,
  note: string | null,
  force: boolean,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_plan", {
    p_email: email,
    p_plan: plan,
    p_expires_on: expiresOn || null,
    p_note: note || null,
    p_force: force,
  });
  if (error) {
    logger.error("Add user plan failed", error);
    throw error;
  }
}

export async function removeUserPlan(email: string, force: boolean): Promise<void> {
  const { error } = await supabase.rpc("admin_remove_user_plan", {
    p_email: email,
    p_force: force,
  });
  if (error) {
    logger.error("Remove user plan failed", error);
    throw error;
  }
}
