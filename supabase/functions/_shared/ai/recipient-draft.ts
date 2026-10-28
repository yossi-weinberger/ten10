/**
 * Reads the recipient of a donation out of text with rules only.
 * Words live in recipient-aliases.ts. The caller decides the text is a donation.
 */

import {
  AMOUNT_CURRENCY_WORDS,
  BIT_MARKERS,
  CASH_MARKERS,
  CHECK_MARKERS,
  CREDIT_MARKERS,
  CURRENCY_MARKERS,
  DATE_WORDS,
  TRANSFER_MARKERS,
} from "./phrase-aliases.ts";
import {
  DONATION_NOUNS,
  DONATION_VERBS,
  GENERIC_RECIPIENT_WORDS,
  LAMED_NON_NAMES,
  RECIPIENT_END_WORDS,
} from "./recipient-aliases.ts";
import {
  FIRST_OF_MONTH_PHRASES,
  FREQUENCY_PHRASES,
  GREGORIAN_MONTHS,
  HOLIDAY_PHRASES,
  RECURRING_MARKERS,
  START_MARKERS,
  START_NEXT_MONTH_PHRASES,
  START_NOW_PHRASES,
  UNTIL_YEAR_END_PHRASES,
  WEEKDAY_FREQUENCY,
} from "./recurring-aliases.ts";

export interface RecipientFromText {
  /** The saved spelling when one matches, otherwise as written. */
  recipient: string;
  /** The text without the recipient phrase. */
  description: string;
}

interface Span {
  start: number;
  end: number;
}

interface Word extends Span {
  endsClause: boolean;
}

const MAX_NAME_WORDS = 4;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function alternation(phrases: readonly string[]): string {
  return phrases
    .map((phrase) => phrase.trim().toLowerCase())
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
}

const DONATION_TRIGGER = new RegExp(
  `(?<![\\p{L}\\d])[ושה]?(?:${alternation([...DONATION_VERBS, ...DONATION_NOUNS])})(?![\\p{L}\\d])`,
  "iu",
);

/** An amount, a payment method, or a date or frequency phrase starts here. */
const NAME_END_PHRASE = new RegExp(
  `^[וב]?(?:${
    alternation([
      ...AMOUNT_CURRENCY_WORDS,
      ...CURRENCY_MARKERS,
      ...CREDIT_MARKERS,
      ...CASH_MARKERS,
      ...TRANSFER_MARKERS,
      ...BIT_MARKERS,
      ...CHECK_MARKERS,
      ...DATE_WORDS,
      ...RECURRING_MARKERS,
      ...FREQUENCY_PHRASES.flatMap((entry) => entry.phrases),
      ...WEEKDAY_FREQUENCY.flatMap((entry) => entry.phrases),
      ...FIRST_OF_MONTH_PHRASES,
      ...START_NOW_PHRASES,
      ...START_NEXT_MONTH_PHRASES,
      ...START_MARKERS,
      ...UNTIL_YEAR_END_PHRASES,
      ...HOLIDAY_PHRASES,
      ...GREGORIAN_MONTHS.flatMap((entry) => entry.names),
      "ש״ח",
      "nis",
      "ils",
    ])
  })(?![\\p{L}\\d])`,
  "iu",
);

const END_WORDS = new Set<string>(RECIPIENT_END_WORDS);
const GENERIC_WORDS = new Set<string>(GENERIC_RECIPIENT_WORDS);
const LAMED_WORDS = new Set<string>(LAMED_NON_NAMES);

function foldName(value: string): string {
  return value.trim().toLowerCase().replace(/["״׳']/g, "").replace(/[-־]/g, " ").replace(/\s+/g, " ").trim();
}

/** The saved spelling of `topic`, ignoring case, quote marks and hyphens. */
export function matchSavedName(topic: string, names: readonly string[]): string | null {
  const needle = foldName(topic);
  const hits = names
    .map((name) => ({ raw: name.trim(), key: foldName(name) }))
    .filter((name) => name.key.length > 1 && name.key === needle)
    .sort((left, right) => right.key.length - left.key.length);
  if (hits.length === 0) return null;
  return hits[0]?.raw ?? null;
}

/** Words without surrounding punctuation. A punctuation-only token is an empty word. */
function wordsOf(text: string): Word[] {
  return [...text.matchAll(/\S+/g)].map((match) => {
    const raw = match[0];
    const at = match.index ?? 0;
    const lead = raw.match(/^[^\p{L}\d]*/u)?.[0].length ?? 0;
    const trail = lead === raw.length ? "" : raw.match(/[^\p{L}\d]*$/u)?.[0] ?? "";
    const end = at + raw.length - trail.length;
    return { start: Math.min(at + lead, end), end, endsClause: /[,.;:!?]/.test(trail) };
  });
}

function endsName(word: string, rest: string): boolean {
  return word === ""
    || /\d/.test(word)
    || END_WORDS.has(word.toLowerCase())
    || /^ול\p{L}/u.test(word)
    || NAME_END_PHRASE.test(rest.toLowerCase().replace(/־/g, " "));
}

function readName(text: string, words: readonly Word[], first: number, firstStart: number): Span | null {
  const firstWord = text.slice(firstStart, words[first].end);
  if (firstWord.replace(/[^\p{L}]/gu, "").length < 2) return null;
  if (GENERIC_WORDS.has(firstWord.toLowerCase())) return null;
  let end = -1;
  for (let i = first; i < words.length && i < first + MAX_NAME_WORDS; i++) {
    const start = i === first ? firstStart : words[i].start;
    if (endsName(text.slice(start, words[i].end), text.slice(start))) break;
    end = words[i].end;
    if (words[i].endsClause) break;
  }
  return end < 0 ? null : { start: firstStart, end };
}

/** «לישיבה», «ל־ישיבה», "to Ezer Mizion", "to the kollel". `cut` covers ל or "to" too. */
function candidates(text: string): { name: Span; cut: Span }[] {
  const words = wordsOf(text);
  const found: { name: Span; cut: Span }[] = [];
  words.forEach((word, index) => {
    const token = text.slice(word.start, word.end);
    let name: Span | null = null;
    const lamed = token.match(/^ל[־-]?/);
    if (lamed && !LAMED_WORDS.has(token)) {
      name = readName(text, words, index, word.start + lamed[0].length);
    } else if (token.toLowerCase() === "to" && !word.endsClause && index + 1 < words.length) {
      const next = words[index + 1];
      const first = text.slice(next.start, next.end).toLowerCase() === "the" && !next.endsClause
        ? index + 2
        : index + 1;
      if (first < words.length) name = readName(text, words, first, words[first].start);
    }
    if (name) found.push({ name, cut: { start: word.start, end: name.end } });
  });
  return found;
}

function without(text: string, span: Span): string {
  return `${text.slice(0, span.start)} ${text.slice(span.end)}`
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

/**
 * A saved recipient after ל or "to" is taken as is. Any other name needs a
 * donation verb or noun before it. Null when the text names no recipient.
 */
export function recipientFromText(
  text: string,
  savedRecipients: readonly string[],
): RecipientFromText | null {
  const found = candidates(text);
  for (const candidate of found) {
    const saved = matchSavedName(text.slice(candidate.name.start, candidate.name.end), savedRecipients);
    if (saved) return { recipient: saved, description: without(text, candidate.cut) };
  }
  const trigger = text.match(DONATION_TRIGGER);
  if (!trigger) return null;
  const after = (trigger.index ?? 0) + trigger[0].length;
  const spoken = found.find((candidate) => candidate.cut.start >= after);
  if (!spoken) return null;
  return {
    recipient: text.slice(spoken.name.start, spoken.name.end),
    description: without(text, spoken.cut),
  };
}
