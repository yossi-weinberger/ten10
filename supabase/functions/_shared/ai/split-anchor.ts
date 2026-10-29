import { amountsFromText, prepareText, resolveDatePhrase } from "./text-draft.ts";

export interface SplitProposal {
  description: string;
  amount: number;
  amount_text: string;
  currency: string;
  date_phrase: string;
  type_hint: string;
}

type SplitCurrency = "ILS" | "USD" | "EUR" | "";
type SplitTypeHint = "income" | "expense" | "donation" | "";

export interface AnchoredSplitItem {
  description: string;
  amount: number;
  currency: SplitCurrency;
  date: string | null;
  typeHint: SplitTypeHint;
}

function occurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let from = 0;
  while (from <= haystack.length - needle.length) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    const before = at > 0 ? haystack.charAt(at - 1) : "";
    const after = haystack.charAt(at + needle.length);
    if (!/\d/.test(before) && !/\d/.test(after)) count += 1;
    from = at + needle.length;
  }
  return count;
}

function currencyOf(value: string): SplitCurrency {
  const upper = value.trim().toUpperCase();
  if (upper === "ILS" || upper === "USD" || upper === "EUR") return upper;
  return "";
}

function typeOf(value: string): SplitTypeHint {
  if (value === "income" || value === "expense" || value === "donation") return value;
  return "";
}

/** Drops a proposal whose amount text is missing, misread, or used more times than it appears. */
export function anchorSplitItems(
  source: string,
  proposals: readonly SplitProposal[],
  today: string,
): { items: AnchoredSplitItem[]; dropped: number } {
  const preparedSource = prepareText(source);
  const used = new Map<string, number>();
  const items: AnchoredSplitItem[] = [];
  let dropped = 0;
  for (const proposal of proposals) {
    const needle = prepareText(proposal.amount_text);
    const parsed = amountsFromText(proposal.amount_text);
    const amountMatches = parsed.length === 1 && parsed[0] === proposal.amount;
    const taken = used.get(needle) ?? 0;
    if (!amountMatches || taken >= occurrences(preparedSource, needle)) {
      dropped += 1;
      continue;
    }
    used.set(needle, taken + 1);
    items.push({
      description: proposal.description.trim(),
      amount: proposal.amount,
      currency: currencyOf(proposal.currency),
      date: resolveDatePhrase(proposal.date_phrase, today),
      typeHint: typeOf(proposal.type_hint),
    });
  }
  return { items, dropped };
}
