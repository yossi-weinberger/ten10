import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

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

export type AdminAiCounts = {
  from: string;
  to: string;
  grain: "day" | "week" | "month";
  first_on: string | null;
  drafts: {
    ready: number;
    needs_review: number;
    approved: number;
    rejected: number;
    committed: number;
    reverted: number;
  };
  messages_by_kind: Record<string, number>;
  origins: { ai: number; ai_auto: number };
  receipt_links: number;
  artifacts: { active: number; deleted: number };
  rules_active: number;
  questions: number;
  question_outcomes: Record<string, number>;
  buckets: AdminAiBucket[];
  users: Array<{ email: string; drafts: number; committed: number; questions: number }>;
};

export type AdminAiSpendBucket = { bucket: string; totalCost: number; requestCount: number };

export type AdminAiSpend = {
  available: boolean;
  mixed: boolean;
  grain: "day" | "week" | "month";
  models: Array<{ label: string; totalCost: number; requestCount: number; inputTokens: number; outputTokens: number }>;
  days: AdminAiSpendBucket[];
  modelBuckets: Array<AdminAiSpendBucket & { model: string }>;
  appBuckets: AdminAiSpendBucket[] | null;
  sources: { app: number; eval: number };
};

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

export async function fetchAdminAiSpend(from: string, to: string): Promise<AdminAiSpend | null> {
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
    return (await response.json()) as AdminAiSpend;
  } catch (error) {
    logger.error("Admin AI spend failed", error);
    return null;
  }
}
