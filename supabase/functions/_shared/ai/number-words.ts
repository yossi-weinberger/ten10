/**
 * Rewrites number words as digits: «שלוש מאות ארבעים ושתיים שקל» -> «342 שקל».
 * Words live in number-word-aliases.ts. Text outside a converted phrase stays byte-identical.
 */

import { TRANSACTION_VERBS } from "./phrase-aliases.ts";
import {
  ENGLISH_AND,
  ENGLISH_HUNDRED,
  ENGLISH_ONE_ARTICLE,
  ENGLISH_TEENS,
  ENGLISH_TENS,
  ENGLISH_THOUSAND,
  ENGLISH_UNITS,
  HEBREW_AND_HALF,
  HEBREW_CONJUNCTION,
  HEBREW_DAY_WORDS,
  HEBREW_HUNDREDS,
  HEBREW_HUNDREDS_PLURAL,
  HEBREW_NUMBER_PREFIXES,
  HEBREW_TEEN_ONLY_UNITS,
  HEBREW_TEN,
  HEBREW_TENS,
  HEBREW_THOUSANDS,
  HEBREW_THOUSANDS_CONSTRUCT,
  HEBREW_THOUSANDS_MULTIPLIERS,
  HEBREW_UNITS,
  HEBREW_WEEKDAY_NUMBER_WORDS,
  NUMBER_CURRENCY_WORDS,
} from "./number-word-aliases.ts";

interface Token {
  word: string;
  start: number;
  end: number;
  /** Only whitespace separates it from the previous token. */
  joined: boolean;
}

/** `next` is the index of the first word after the number. */
interface Hit {
  value: number;
  next: number;
}

type Table = ReadonlyMap<string, number>;

const table = (record: Readonly<Record<string, number>>): Table => new Map(Object.entries(record));

const HE_UNITS = table(HEBREW_UNITS);
const HE_TEEN_ONLY = table(HEBREW_TEEN_ONLY_UNITS);
const HE_TEN = table(HEBREW_TEN);
const HE_TENS = table(HEBREW_TENS);
const HE_HUNDREDS = table(HEBREW_HUNDREDS);
const HE_THOUSANDS = table(HEBREW_THOUSANDS);
const HE_CONSTRUCT = table(HEBREW_THOUSANDS_CONSTRUCT);
const EN_UNITS = table(ENGLISH_UNITS);
const EN_TEENS = table(ENGLISH_TEENS);
const EN_TENS = table(ENGLISH_TENS);

const HE_THOUSAND_WORDS = new Set<string>([...HE_THOUSANDS.keys(), ...HEBREW_THOUSANDS_MULTIPLIERS]);
const HE_HUNDRED_WORDS = new Set<string>([...HE_HUNDREDS.keys(), HEBREW_HUNDREDS_PLURAL]);
const HE_MULTIPLIERS = new Set<string>(HEBREW_THOUSANDS_MULTIPLIERS);
const DAY_WORDS = new Set<string>(HEBREW_DAY_WORDS);
const WEEKDAY_NUMBER_WORDS = new Set<string>(HEBREW_WEEKDAY_NUMBER_WORDS);
const PREFIXES = new Set<string>(HEBREW_NUMBER_PREFIXES);
const PAYMENT_VERBS = new Set<string>(TRANSACTION_VERBS);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CURRENCY_AFTER = new RegExp(
  `^\\s*(?:${
    [...NUMBER_CURRENCY_WORDS].sort((left, right) => right.length - left.length).map(escapeRegExp).join("|")
  })(?![\\p{L}\\d])`,
  "iu",
);

/** Hebrew letters only, so a maqaf or gershayim splits words. A maqaf or hyphen between them still joins the phrase. English may be hyphenated. */
function tokenize(text: string): Token[] {
  let previousEnd = -1;
  return [...text.matchAll(/[a-z]+(?:-[a-z]+)*|[\u05D0-\u05EA]+/gi)].map((match) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const between = previousEnd >= 0 ? text.slice(previousEnd, start) : "";
    const joined = previousEnd >= 0 && /^[\s־\-–]+$/.test(between);
    previousEnd = end;
    return { word: match[0].toLowerCase(), start, end, joined };
  });
}

function verbBefore(tokens: readonly Token[], index: number): boolean {
  for (let i = 0; i < index; i++) {
    const word = tokens[i].word;
    if (PAYMENT_VERBS.has(word)) return true;
    if (word.startsWith(HEBREW_CONJUNCTION) && PAYMENT_VERBS.has(word.slice(HEBREW_CONJUNCTION.length))) {
      return true;
    }
  }
  return false;
}

/** Value of `words[i]` in `values`. With `conj`, a leading ו is allowed: «ושתיים». */
function he(words: readonly string[], i: number, values: Table, conj: boolean): number | null {
  const word = words[i];
  if (word === undefined) return null;
  const direct = values.get(word);
  if (direct !== undefined) return direct;
  if (!conj || !word.startsWith(HEBREW_CONJUNCTION)) return null;
  return values.get(word.slice(HEBREW_CONJUNCTION.length)) ?? null;
}

function hebrewBelow100(words: readonly string[], i: number, conj: boolean): Hit | null {
  const tens = he(words, i, HE_TENS, conj);
  if (tens !== null) {
    const unit = he(words, i + 1, HE_UNITS, true);
    return unit === null ? { value: tens, next: i + 1 } : { value: tens + unit, next: i + 2 };
  }
  const unit = he(words, i, HE_UNITS, conj);
  const teenUnit = unit ?? he(words, i, HE_TEEN_ONLY, conj);
  if (teenUnit !== null && he(words, i + 1, HE_TEN, false) !== null) return { value: teenUnit + 10, next: i + 2 };
  if (unit !== null) return { value: unit, next: i + 1 };
  return he(words, i, HE_TEN, conj) === null ? null : { value: 10, next: i + 1 };
}

function hebrewBelow1000(words: readonly string[], i: number, conj: boolean): Hit | null {
  let hundreds: Hit | null = null;
  const fixed = he(words, i, HE_HUNDREDS, conj);
  if (fixed !== null) hundreds = { value: fixed, next: i + 1 };
  const unit = he(words, i, HE_UNITS, conj);
  if (unit !== null && words[i + 1] === HEBREW_HUNDREDS_PLURAL) hundreds = { value: unit * 100, next: i + 2 };
  if (!hundreds) return hebrewBelow100(words, i, conj);
  const rest = hebrewBelow100(words, hundreds.next, true);
  return rest ? { value: hundreds.value + rest.value, next: rest.next } : hundreds;
}

function hebrewNumber(words: readonly string[]): Hit | null {
  let thousands: Hit | null = null;
  const fixed = he(words, 0, HE_THOUSANDS, false);
  const construct = he(words, 0, HE_CONSTRUCT, false);
  const group = hebrewBelow1000(words, 0, false);
  if (fixed !== null) thousands = { value: fixed, next: 1 };
  else if (construct !== null && HE_MULTIPLIERS.has(words[1] ?? "")) thousands = { value: construct * 1000, next: 2 };
  else if (group && HE_MULTIPLIERS.has(words[group.next] ?? "")) {
    thousands = { value: group.value * 1000, next: group.next + 1 };
  }

  let hit = group;
  if (thousands) {
    const rest = hebrewBelow1000(words, thousands.next, true);
    hit = rest ? { value: thousands.value + rest.value, next: rest.next } : thousands;
  }
  if (!hit) return null;

  if (words[hit.next] !== HEBREW_AND_HALF) return hit;
  const last = words[hit.next - 1];
  if (isWord(last, HE_THOUSAND_WORDS)) return { value: hit.value + 500, next: hit.next + 1 };
  if (isWord(last, HE_HUNDRED_WORDS)) return { value: hit.value + 50, next: hit.next + 1 };
  return hit;
}

function isWord(word: string, words: ReadonlySet<string>): boolean {
  if (words.has(word)) return true;
  return word.startsWith(HEBREW_CONJUNCTION) && words.has(word.slice(HEBREW_CONJUNCTION.length));
}

function englishBelow100(words: readonly string[], i: number): Hit | null {
  const word = words[i];
  if (word === undefined) return null;
  const [head, tail, ...more] = word.split("-");
  const tens = EN_TENS.get(head);
  if (tail !== undefined) {
    const unit = EN_UNITS.get(tail);
    return tens !== undefined && unit !== undefined && more.length === 0 ? { value: tens + unit, next: i + 1 } : null;
  }
  if (tens !== undefined) {
    const unit = EN_UNITS.get(words[i + 1] ?? "");
    return unit === undefined ? { value: tens, next: i + 1 } : { value: tens + unit, next: i + 2 };
  }
  const small = EN_TEENS.get(word) ?? EN_UNITS.get(word);
  return small === undefined ? null : { value: small, next: i + 1 };
}

/** The part after hundred or thousand, with an optional "and". */
function englishRest(words: readonly string[], i: number, below: typeof englishBelow100): Hit | null {
  if (words[i] === ENGLISH_AND) return below(words, i + 1);
  return below(words, i);
}

function englishBelow1000(words: readonly string[], i: number): Hit | null {
  let hundreds: Hit | null = null;
  if (words[i] === ENGLISH_ONE_ARTICLE && words[i + 1] === ENGLISH_HUNDRED) hundreds = { value: 100, next: i + 2 };
  const lead = englishBelow100(words, i);
  if (lead && words[lead.next] === ENGLISH_HUNDRED) hundreds = { value: lead.value * 100, next: lead.next + 1 };
  if (!hundreds) return lead;
  const rest = englishRest(words, hundreds.next, englishBelow100);
  return rest ? { value: hundreds.value + rest.value, next: rest.next } : hundreds;
}

function englishNumber(words: readonly string[]): Hit | null {
  let thousands: Hit | null = null;
  if (words[0] === ENGLISH_ONE_ARTICLE && words[1] === ENGLISH_THOUSAND) thousands = { value: 1000, next: 2 };
  const group = englishBelow1000(words, 0);
  if (group && words[group.next] === ENGLISH_THOUSAND) thousands = { value: group.value * 1000, next: group.next + 1 };
  if (!thousands) return group;
  const rest = englishRest(words, thousands.next, englishBelow1000);
  return rest ? { value: thousands.value + rest.value, next: rest.next } : thousands;
}

interface Phrase {
  prefix: string;
  value: number;
  /** Index of the first token after the phrase. */
  next: number;
}

/** The longest number phrase starting at token `index`, if it should become digits. */
function phraseAt(text: string, tokens: readonly Token[], index: number): Phrase | null {
  const words = [tokens[index].word];
  for (let i = index + 1; i < tokens.length && tokens[i].joined; i++) words.push(tokens[i].word);

  let prefix = "";
  let hit: Hit | null;
  if (/^[a-z]/.test(words[0])) {
    hit = englishNumber(words);
  } else {
    const previous = index > 0 ? tokens[index - 1].word : "";
    if (DAY_WORDS.has(previous) && WEEKDAY_NUMBER_WORDS.has(words[0])) return null;
    hit = hebrewNumber(words);
    const first = words[0].charAt(0);
    if (!hit && words[0].length > 1 && PREFIXES.has(first)) {
      prefix = first;
      hit = hebrewNumber([words[0].slice(1), ...words.slice(1)]);
    }
  }
  if (!hit) return null;

  const end = tokens[index + hit.next - 1].end;
  const currency = CURRENCY_AFTER.test(text.slice(end));
  if (!currency && (hit.value < 20 || !verbBefore(tokens, index))) return null;
  return { prefix, value: hit.value, next: index + hit.next };
}

/**
 * Replaces each number-word phrase with digits. A phrase stays as words unless a
 * currency word follows it, or it is at least 20 and a payment verb comes before
 * it. «פעם אחת», «שלוש חולצות», «במאה שערים», "one month" stay words.
 * A kept Hebrew prefix is joined with a maqaf, «ב־300», because the amount
 * parser skips digits glued to letters.
 */
export function numberWordsToDigits(text: string): string {
  const tokens = tokenize(text);
  let output = "";
  let copied = 0;
  for (let i = 0; i < tokens.length;) {
    const phrase = phraseAt(text, tokens, i);
    if (!phrase) {
      i++;
      continue;
    }
    const digits = phrase.prefix ? `${phrase.prefix}־${phrase.value}` : String(phrase.value);
    output += text.slice(copied, tokens[i].start) + digits;
    copied = tokens[phrase.next - 1].end;
    i = phrase.next;
  }
  return output + text.slice(copied);
}
