import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";

export type AdminAiCounts = {
  from: string;
  to: string;
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
  users: Array<{ email: string; drafts: number; committed: number; questions: number }>;
};

export type AdminAiSpend = {
  available: boolean;
  mixed: boolean;
  models: Array<{ label: string; totalCost: number; requestCount: number; inputTokens: number; outputTokens: number }>;
  days: Array<{ label: string; totalCost: number; requestCount: number; inputTokens: number; outputTokens: number }>;
};

function lastSevenDays(): { from: string; to: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const day = (date: Date) => date.toISOString().slice(0, 10);
  return { from: day(start), to: day(end) };
}

export async function fetchAdminAiCounts(): Promise<AdminAiCounts | null> {
  const range = lastSevenDays();
  const { data, error } = await supabase.rpc("get_admin_ai_stats", {
    p_from: range.from,
    p_to: range.to,
  });
  if (error) {
    logger.error("Admin AI counts failed", error);
    return null;
  }
  return data as AdminAiCounts;
}

export async function fetchAdminAiSpend(): Promise<AdminAiSpend | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!accessToken || !supabaseUrl) return null;
  const response = await fetch(`${supabaseUrl}/functions/v1/get-ai-admin-spend`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    logger.error("Admin AI spend failed", response.status);
    return null;
  }
  return (await response.json()) as AdminAiSpend;
}
