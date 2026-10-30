import { MAX_ITEMS_PER_MESSAGE } from "./multi-item.ts";
import { anchorSplitItems, type AnchoredSplitItem, type SplitProposal } from "./split-anchor.ts";

export type SplitResponse =
  | { route: "list" }
  | { route: "unreadable" }
  | { route: "several"; items: AnchoredSplitItem[]; found: number; dropped: number };

function readArray(payload: unknown): unknown[] | null {
  let value = payload;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      value = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: unknown[] }).items;
  }
  return null;
}

function readProposal(value: unknown): SplitProposal | null {
  if (!value || typeof value !== "object") return null;
  const source = value as {
    description?: unknown;
    amount?: unknown;
    amount_text?: unknown;
    currency?: unknown;
    date_phrase?: unknown;
    type_hint?: unknown;
  };
  const amount = typeof source.amount === "number" ? source.amount : Number(source.amount);
  if (typeof source.amount_text !== "string" || !Number.isFinite(amount)) return null;
  return {
    description: typeof source.description === "string" ? source.description : "",
    amount,
    amount_text: source.amount_text,
    currency: typeof source.currency === "string" ? source.currency : "",
    date_phrase: typeof source.date_phrase === "string" ? source.date_phrase : "",
    type_hint: typeof source.type_hint === "string" ? source.type_hint : "",
  };
}

/** More than the intake cap is a list. A reply that keeps nothing is unreadable. */
export function readSplitResponse(source: string, payload: unknown, today: string): SplitResponse {
  const rows = readArray(payload);
  if (!rows || rows.length === 0) return { route: "unreadable" };
  if (rows.length > MAX_ITEMS_PER_MESSAGE) return { route: "list" };

  const proposals: SplitProposal[] = [];
  let dropped = 0;
  for (const row of rows) {
    const proposal = readProposal(row);
    if (proposal) proposals.push(proposal);
    else dropped += 1;
  }
  const anchored = anchorSplitItems(source, proposals, today);
  dropped += anchored.dropped;
  if (anchored.items.length === 0) return { route: "unreadable" };
  return { route: "several", items: anchored.items, found: anchored.items.length, dropped };
}
