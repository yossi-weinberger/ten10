import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { claimBetaConsentRequired } from "@/lib/ai/beta-consent-required";
import type { AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import type { ResolvedQuestion } from "../../../supabase/functions/_shared/ai/split-response.ts";
import type { SplitRuleInput } from "../../../supabase/functions/_shared/ai/split-schema.ts";
import { readLimitInfo, type LimitInfo } from "@/lib/ai/limit-reason";

/** continues and discards are about the card on screen, on every route. */
type CardFlags = { continues?: boolean; discards?: boolean };

export type SplitItemsResult =
  | ({ ok: true; route: "list"; usageId: string | null } & CardFlags)
  | ({ ok: true; route: "unreadable"; usageId: string | null } & CardFlags)
  | ({
    ok: true;
    route: "several";
    items: AnchoredSplitItem[];
    found: number;
    dropped: number;
    rule: SplitRuleInput | null;
    question: ResolvedQuestion | null;
    usageId: string | null;
  } & CardFlags)
  | { ok: false; reason: "LIMIT"; limit: LimitInfo }
  | { ok: false; reason: "BETA_CONSENT" }
  | { ok: false; reason: "UNAVAILABLE" };

export interface SplitCallOptions {
  timeZone?: string;
  receivedAt?: string;
  defaultCurrency?: string;
  calendar?: "gregorian" | "hebrew";
  /** The earlier-turns block from conversationContext. */
  context?: string;
  /** The words and amounts of the open draft or standing order. A continuing message may keep an amount only from them. */
  cardEvidence?: string;
  /** The message's turn id, also sent to the classify call, so the message is charged once. */
  turn?: string;
}

function usageIdOf(body: { usage_id?: unknown }): string | null {
  return typeof body.usage_id === "string" ? body.usage_id : null;
}

export async function splitItems(
  text: string,
  today: string,
  options: SplitCallOptions = {},
): Promise<SplitItemsResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "UNAVAILABLE" };
  const { data, error } = await supabase.functions.invoke("ai-split-items", {
    body: {
      text,
      today,
      timeZone: options.timeZone,
      receivedAt: options.receivedAt,
      defaultCurrency: options.defaultCurrency,
      calendar: options.calendar,
      ...(options.context ? { context: options.context } : {}),
      ...(options.cardEvidence ? { cardEvidence: options.cardEvidence } : {}),
      ...(options.turn ? { turn: options.turn } : {}),
    },
  });
  if (await claimBetaConsentRequired(error, data)) return { ok: false, reason: "BETA_CONSENT" };
  if (error || !data || typeof data !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const limit = readLimitInfo(data);
  if (limit) return { ok: false, reason: "LIMIT", limit };
  const body = data as {
    route?: unknown;
    reason?: unknown;
    items?: unknown;
    found?: unknown;
    dropped?: unknown;
    rule?: unknown;
    question?: unknown;
    usage_id?: unknown;
    continues?: unknown;
    discards?: unknown;
  };
  if (body.reason === "unavailable" || body.reason === "not_allowed") {
    return { ok: false, reason: "UNAVAILABLE" };
  }
  const usageId = usageIdOf(body);
  const flags = { continues: body.continues === true, discards: body.discards === true };
  if (body.route === "list" || body.route === "unreadable") return { ok: true, route: body.route, usageId, ...flags };
  if (body.route === "several" && Array.isArray(body.items)) {
    const rule = body.rule && typeof body.rule === "object" ? body.rule as SplitRuleInput : null;
    const question = body.question && typeof body.question === "object" ? body.question as ResolvedQuestion : null;
    return {
      ok: true,
      route: "several",
      items: body.items as AnchoredSplitItem[],
      found: typeof body.found === "number" ? body.found : body.items.length,
      dropped: typeof body.dropped === "number" ? body.dropped : 0,
      rule,
      question,
      usageId,
      ...flags,
    };
  }
  return { ok: false, reason: "UNAVAILABLE" };
}

