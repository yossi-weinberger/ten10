import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import type { ActiveUserRule, RuleActionType } from "@/lib/ai/classify-intake";

export async function listActiveUserRules(): Promise<ActiveUserRule[]> {
  if (!aiCallsAllowed()) return [];
  const { data, error } = await supabase.rpc("list_ai_user_rules");
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as { name?: unknown; type?: unknown };
    if (typeof record.name !== "string" || typeof record.type !== "string") return [];
    if (
      record.type !== "exempt-income" &&
      record.type !== "recognized-expense" &&
      record.type !== "non_tithe_donation"
    ) {
      return [];
    }
    return [{ name: record.name, type: record.type }];
  });
}

export async function approveUserRule(
  name: string,
  type: RuleActionType,
  effectiveFrom: string,
): Promise<boolean> {
  if (!aiCallsAllowed()) return false;
  const { error } = await supabase.rpc("approve_ai_user_rule", {
    p_name: name,
    p_type: type,
    p_effective_from: effectiveFrom,
  });
  return !error;
}

export async function disableUserRule(name: string, type: RuleActionType): Promise<boolean> {
  if (!aiCallsAllowed()) return false;
  const { data, error } = await supabase.rpc("disable_ai_user_rule", {
    p_name: name,
    p_type: type,
  });
  if (error || !data || typeof data !== "object") return false;
  return (data as { disabled?: boolean }).disabled === true;
}
