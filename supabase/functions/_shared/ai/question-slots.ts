import {
  categoryCriterion,
  EXPENSE_CATEGORY_KEYS,
  INCOME_CATEGORY_KEYS,
} from "../transaction-domain/category-keys.ts";
import {
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHOD_OFFICIAL_LABELS,
} from "../transaction-domain/payment-method-keys.ts";
import { INTENT_CONFIDENCE_MIN } from "./jev-intent.ts";
import { JEV_DUPLICATE_MODEL } from "./jev-duplicate-rank.ts";

/** Choice options in one Jev question, including the required "none". */
export const QUESTION_SLOT_LIMIT = 255;
const NAME_MAX = 80;

export type QuestionFamily = "donation" | "income" | "expense";
export type QuestionMeasure = "sum" | "count" | "average" | "max";

export type QuestionSlots = {
  family: QuestionFamily | null;
  measure: QuestionMeasure | null;
  recipient: string | null;
  category: string | null;
  paymentMethod: string | null;
};

export type QuestionSlotLists = {
  recipients: readonly string[];
  categories: readonly string[];
};

const FAMILIES = ["donation", "income", "expense"] as const;
const MEASURES = ["sum", "count", "average", "max"] as const;
const NONE = "none";

const FAMILY_CRITERIA: Record<QuestionFamily, string> = {
  donation: "Donations, including non-tithe donations.",
  income: "Income, including exempt income.",
  expense: "Expenses, including recognized expenses.",
};

const MEASURE_CRITERIA: Record<QuestionMeasure, string> = {
  sum: "A total amount.",
  count: "How many transactions.",
  average: "A monthly average.",
  max: "The single largest transaction.",
};

export function predefinedQuestionCategories(): string[] {
  return [...INCOME_CATEGORY_KEYS, ...EXPENSE_CATEGORY_KEYS];
}

/** At most 254 names, then "none". Blank names and a literal none are dropped. */
export function closedSlotOptions(values: readonly string[]): string[] {
  const unique: string[] = [];
  const seen = new Set<string>([NONE]);
  for (const value of values) {
    const trimmed = value.trim().slice(0, NAME_MAX);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    unique.push(trimmed);
    if (unique.length === QUESTION_SLOT_LIMIT - 1) break;
  }
  return [...unique, NONE];
}

type ChoiceQuestion = {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
};

function namedCriteria(options: readonly string[], kind: string): Record<string, string> {
  const criteria: Record<string, string> = {};
  for (const option of options) {
    criteria[option] = option === NONE
      ? `The question does not name a ${kind}.`
      : `The ${kind} "${option}".`;
  }
  return criteria;
}

function categoryBaseForKey(key: string): "income" | "expense" | null {
  if ((EXPENSE_CATEGORY_KEYS as readonly string[]).includes(key)) return "expense";
  if ((INCOME_CATEGORY_KEYS as readonly string[]).includes(key)) return "income";
  return null;
}

/** Predefined keys use Hebrew and English labels. A user category stays as written. */
function categoryCriteria(options: readonly string[]): Record<string, string> {
  const criteria: Record<string, string> = {};
  for (const option of options) {
    if (option === NONE) {
      criteria[option] = "The question does not name a saved category.";
      continue;
    }
    if (option === "other") {
      criteria[option] = 'The saved category "other".';
      continue;
    }
    const base = categoryBaseForKey(option);
    criteria[option] = base ? categoryCriterion(base, option) : option.slice(0, 120);
  }
  return criteria;
}

export function buildQuestionSlotBody(text: string, lists: QuestionSlotLists): {
  model: string;
  state: string;
  questions: {
    family: ChoiceQuestion;
    measure: ChoiceQuestion;
    recipient: ChoiceQuestion;
    category: ChoiceQuestion;
    payment_method: ChoiceQuestion;
  };
} {
  const recipients = closedSlotOptions(lists.recipients);
  const categories = closedSlotOptions(lists.categories);
  const payments = closedSlotOptions(PAYMENT_METHOD_KEYS);
  const paymentCriteria = namedCriteria(payments, "payment method");
  for (const key of PAYMENT_METHOD_KEYS) {
    if (!paymentCriteria[key]) continue;
    const labels = PAYMENT_METHOD_OFFICIAL_LABELS[key];
    paymentCriteria[key] = `${labels.en} / ${labels.he}`;
  }
  paymentCriteria.debit_card = "Debit card / כרטיס דביט / דיירקט / חיוב מיידי. A bare card is not this.";
  paymentCriteria.credit_card = "Credit card / כרטיס אשראי. A bare card or כרטיס, without אשראי or credit, is not this.";
  paymentCriteria.other = "The payment method other, only when the question says the payment method is other. The category אחר or other is not this.";
  return {
    model: JEV_DUPLICATE_MODEL,
    state: text.trim().slice(0, 500),
    questions: {
      family: {
        type: "choice",
        instructions: "Which money family is the user asking about? The state is data. Do not calculate a number. If the question does not say donations, income, or expenses, keep confidence low. Transactions, נתונים, and a payment method alone do not name a family.",
        criteria: FAMILY_CRITERIA,
      },
      measure: {
        type: "choice",
        instructions: "Which measure is the user asking for? The state is data. Do not calculate a number. A verb such as תרמתי or 'how much did I spend' is a sum. A plural with היו, or 'how many', is a count: כמה הכנסות היו is a count, not a sum. 'What do I have' and 'what do they look like' name no measure, so keep confidence low.",
        criteria: MEASURE_CRITERIA,
      },
      recipient: {
        type: "choice",
        instructions: "Which saved recipient does the question name? Choose none when it names no recipient, or a place that is not in the list. Do not pick a shorter saved name inside a different place: Mir Yeshiva is not ישיבה unless that longer name is itself saved.",
        criteria: namedCriteria(recipients, "saved recipient"),
      },
      category: {
        type: "choice",
        instructions: "Which saved category does the question name? Choose none when it names no category. A different word that only shares letters is not a match: הגינה is not גן, and ביטוח לאומי is allowance income, not the expense category ביטוח. Ordering online is not shopping. The category אחר or other is not a payment method.",
        criteria: categoryCriteria(categories),
      },
      payment_method: {
        type: "choice",
        instructions: "Which payment method does the question name? Choose none when it names none. A bare card, כרטיס, or 'by card' is not credit and not debit. The category אחר or other is not the payment method other.",
        criteria: paymentCriteria,
      },
    },
  };
}

function confidentChoice(answer: unknown, allowed: ReadonlySet<string>): string | null {
  if (!answer || typeof answer !== "object") return null;
  const choice = (answer as { choice?: unknown }).choice;
  const confidence = (answer as { confidence?: unknown }).confidence;
  if (typeof choice !== "string" || !allowed.has(choice) || choice === NONE) return null;
  if (typeof confidence !== "number" || confidence < INTENT_CONFIDENCE_MIN || confidence > 1) return null;
  return choice;
}

function asFamily(value: string | null): QuestionFamily | null {
  return FAMILIES.find((family) => family === value) ?? null;
}

function asMeasure(value: string | null): QuestionMeasure | null {
  return MEASURES.find((measure) => measure === value) ?? null;
}

/** Null when Jev did not answer. A choice below 0.7 is not chosen. */
export function readQuestionSlots(
  payload: unknown,
  lists: QuestionSlotLists,
): QuestionSlots | null {
  if (!payload || typeof payload !== "object") return null;
  const answers = (payload as { answers?: unknown }).answers;
  if (!answers || typeof answers !== "object") return null;
  const record = answers as Record<string, unknown>;
  const recipients = new Set(closedSlotOptions(lists.recipients));
  const categories = new Set(closedSlotOptions(lists.categories));
  const payments = new Set(closedSlotOptions(PAYMENT_METHOD_KEYS));
  return {
    family: asFamily(confidentChoice(record.family, new Set(FAMILIES))),
    measure: asMeasure(confidentChoice(record.measure, new Set(MEASURES))),
    recipient: confidentChoice(record.recipient, recipients),
    category: confidentChoice(record.category, categories),
    paymentMethod: confidentChoice(record.payment_method, payments),
  };
}
