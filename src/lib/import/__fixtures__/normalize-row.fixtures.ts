// Characterization fixtures for normalizeRow: they record what the importer
// does today, including odd results. Keep this file free of `@/` imports and
// app dependencies so it can move to supabase/functions/_shared unchanged.

export interface FixtureIssue {
  code: string;
  field?: string;
  detail?: string;
}

export interface FixtureNormalizedRow {
  date: string;
  amount: number;
  currency: string;
  description: string | null;
  type: string;
  category: string | null;
  recipient: string | null;
  payment_method: string | null;
  is_chomesh: boolean;
  original_amount: null;
  original_currency: null;
  conversion_rate: null;
  conversion_date: null;
  rate_source: null;
  source_recurring_id: null;
  occurrence_number: null;
}

export interface NormalizeRowFixture {
  name: string;
  defaultCurrency: string;
  input: Record<string, unknown>;
  expected: {
    normalized: FixtureNormalizedRow | null;
    issues: FixtureIssue[];
  };
}

const DATE = "2024-03-15";

function row(
  overrides: Partial<FixtureNormalizedRow> &
    Pick<FixtureNormalizedRow, "amount" | "type">,
): FixtureNormalizedRow {
  return {
    date: DATE,
    currency: "ILS",
    description: null,
    category: null,
    recipient: null,
    payment_method: null,
    is_chomesh: false,
    original_amount: null,
    original_currency: null,
    conversion_rate: null,
    conversion_date: null,
    rate_source: null,
    source_recurring_id: null,
    occurrence_number: null,
    ...overrides,
  };
}

function ok(
  name: string,
  input: Record<string, unknown>,
  normalized: FixtureNormalizedRow,
  issues: FixtureIssue[] = [],
  defaultCurrency = "ILS",
): NormalizeRowFixture {
  return {
    name,
    defaultCurrency,
    input: { date: DATE, ...input },
    expected: { normalized, issues },
  };
}

function rejected(
  name: string,
  input: Record<string, unknown>,
  issues: FixtureIssue[],
  defaultCurrency = "ILS",
): NormalizeRowFixture {
  return {
    name,
    defaultCurrency,
    input: { date: DATE, ...input },
    expected: { normalized: null, issues },
  };
}

export const IMPORTED_TYPE_FIXTURES: NormalizeRowFixture[] = [
  ok("explicit income", { amount: "100", type: "income" }, row({ amount: 100, type: "income" })),
  ok(
    "explicit expense keeps a positive amount as expense",
    { amount: "100", type: "expense" },
    row({ amount: 100, type: "expense" }),
  ),
  ok(
    "explicit Hebrew expense",
    { amount: "-100", type: "הוצאה" },
    row({ amount: 100, type: "expense" }),
  ),
  ok(
    "explicit Hebrew donation drops the category and keeps the recipient",
    { amount: "-50", type: "תרומה", category: "food", recipient: "Kupat Ha'ir" },
    row({ amount: 50, type: "donation", recipient: "Kupat Ha'ir" }),
  ),
  ok(
    "explicit English donation alias",
    { amount: "50", type: "Tzedaka" },
    row({ amount: 50, type: "donation" }),
  ),
  ok(
    "explicit Hebrew recognized-expense alias",
    { amount: "-80", type: "הוצאה מוכרת" },
    row({ amount: 80, type: "recognized-expense" }),
  ),
  ok(
    "explicit English recognized-expense alias, positive amount",
    { amount: "80", type: "Business Expense" },
    row({ amount: 80, type: "recognized-expense" }),
  ),
];

export const RECOGNIZED_EXPENSE_FIXTURES: NormalizeRowFixture[] = [
  ok(
    "recognized-expense is never inferred from the description",
    { amount: "-80", description: "business expense" },
    row({ amount: 80, type: "expense", description: "business expense" }),
  ),
  ok(
    "the literal key recognized-expense is not an alias and falls back to the sign (negative)",
    { amount: "-80", type: "recognized-expense" },
    row({ amount: 80, type: "expense" }),
  ),
  ok(
    "the literal key recognized-expense is not an alias and falls back to the sign (positive)",
    { amount: "80", type: "recognized-expense" },
    row({ amount: 80, type: "income" }),
  ),
];

export const SPECIAL_TYPE_FIXTURES: NormalizeRowFixture[] = [
  ok(
    "exempt-income is not importable and falls back to the sign",
    { amount: "100", type: "exempt-income" },
    row({ amount: 100, type: "income" }),
  ),
  ok(
    "non_tithe_donation is not importable and falls back to the sign",
    { amount: "-100", type: "non_tithe_donation" },
    row({ amount: 100, type: "expense" }),
  ),
  ok(
    "initial_balance is not importable and falls back to the sign",
    { amount: "100", type: "initial_balance" },
    row({ amount: 100, type: "income" }),
  ),
  ok(
    "Ten10 self-export label רגילה falls back to the sign",
    { amount: "-100", type: "רגילה" },
    row({ amount: 100, type: "expense" }),
  ),
  ok(
    "unknown bank-specific type text is ignored without an issue",
    { amount: "-100", type: "הוראת קבע" },
    row({ amount: 100, type: "expense" }),
  ),
];

export const SIGN_INFERENCE_FIXTURES: NormalizeRowFixture[] = [
  ok("positive amount without a type column", { amount: "250.5" }, row({ amount: 250.5, type: "income" })),
  ok("negative amount without a type column", { amount: "-250.5" }, row({ amount: 250.5, type: "expense" })),
  ok("parentheses mean negative", { amount: "(42.10)" }, row({ amount: 42.1, type: "expense" })),
  ok("shekel sign and thousands separator", { amount: "₪1,234.56" }, row({ amount: 1234.56, type: "income" })),
  ok("decimal comma format", { amount: "1.234,56" }, row({ amount: 1234.56, type: "income" })),
  ok("debit column only", { debit: "30" }, row({ amount: 30, type: "expense" })),
  ok("credit column only", { credit: "30" }, row({ amount: 30, type: "income" })),
  ok(
    "both debit and credit use the net amount and flag ambiguity",
    { debit: "30", credit: "100" },
    row({ amount: 70, type: "income" }),
    [{ code: "ambiguous_debit_credit" }],
  ),
  ok(
    "negative amount with a Hebrew income keyword becomes income",
    { amount: "-500", description: "ביטוח לאומי" },
    row({ amount: 500, type: "income", description: "ביטוח לאומי" }),
    [{ code: "income_keyword_match" }],
  ),
  ok(
    "income keyword is a substring match (work inside homework)",
    { amount: "-40", description: "Homework supplies" },
    row({ amount: 40, type: "income", description: "Homework supplies" }),
    [{ code: "income_keyword_match" }],
  ),
  ok(
    "income keyword in the category also flips a negative amount",
    { amount: "-40", category: "Salary" },
    row({ amount: 40, type: "income", category: "salary" }),
    [{ code: "income_keyword_match" }],
  ),
  ok(
    "explicit type wins over an income keyword",
    { amount: "-500", type: "expense", description: "salary refund" },
    row({ amount: 500, type: "expense", description: "salary refund" }),
  ),
  ok(
    "formula cell value is used",
    { amount: { __formulaValue: 12 } },
    row({ amount: 12, type: "income" }),
  ),
  ok(
    "leading formula characters are stripped from text",
    { amount: "-10", description: "=SUM(A1)" },
    row({ amount: 10, type: "expense", description: "SUM(A1)" }),
  ),
  rejected("missing amount", {}, [{ code: "missing_required_field", field: "amount" }]),
  rejected("unparseable amount", { amount: "abc" }, [{ code: "invalid_amount", field: "amount" }]),
  rejected("zero amount", { amount: "0" }, [{ code: "zero_amount", field: "amount" }]),
];

export const CURRENCY_FIXTURES: NormalizeRowFixture[] = [
  ok("no currency column uses the default", { amount: "10" }, row({ amount: 10, type: "income" })),
  ok("default currency by ISO code", { amount: "10", currency: "ILS" }, row({ amount: 10, type: "income" })),
  ok("default currency by lowercase code", { amount: "10", currency: "ils" }, row({ amount: 10, type: "income" })),
  ok("default currency by symbol", { amount: "10", currency: "₪" }, row({ amount: 10, type: "income" })),
  ok(
    "dollar sign is USD when USD is the default",
    { amount: "10", currency: "$" },
    row({ amount: 10, type: "income", currency: "USD" }),
    [],
    "USD",
  ),
  rejected(
    "supported foreign currency is rejected",
    { amount: "10", currency: "USD" },
    [{ code: "foreign_currency_not_supported", field: "currency", detail: "USD" }],
  ),
  rejected(
    "dollar sign maps to USD and is rejected as foreign",
    { amount: "10", currency: "$" },
    [{ code: "foreign_currency_not_supported", field: "currency", detail: "USD" }],
  ),
  rejected(
    "euro symbol maps to EUR and is rejected as foreign",
    { amount: "10", currency: "€" },
    [{ code: "foreign_currency_not_supported", field: "currency", detail: "EUR" }],
  ),
  rejected(
    "unsupported currency keeps the raw text as detail",
    { amount: "10", currency: "jpy" },
    [{ code: "unsupported_currency", field: "currency", detail: "jpy" }],
  ),
];

export const CATEGORY_FIXTURES: NormalizeRowFixture[] = [
  ok(
    "Hebrew expense category label maps to its key",
    { amount: "-10", category: "מזון" },
    row({ amount: 10, type: "expense", category: "food" }),
  ),
  ok(
    "English category label maps to its key",
    { amount: "-10", category: "Food" },
    row({ amount: 10, type: "expense", category: "food" }),
  ),
  ok(
    "category key is kept",
    { amount: "-10", category: "transportation" },
    row({ amount: 10, type: "expense", category: "transportation" }),
  ),
  ok(
    "category mapping ignores the transaction type",
    { amount: "-10", category: "משכורת" },
    row({ amount: 10, type: "expense", category: "salary" }),
  ),
  ok(
    "Hebrew other maps to other",
    { amount: "10", category: "אחר" },
    row({ amount: 10, type: "income", category: "other" }),
  ),
  ok(
    "custom category is kept as typed",
    { amount: "-10", category: "Gym" },
    row({ amount: 10, type: "expense", category: "Gym" }),
  ),
];

export const PAYMENT_METHOD_FIXTURES: NormalizeRowFixture[] = [
  ok(
    "Hebrew payment method label maps to its key",
    { amount: "-10", payment_method: "כרטיס אשראי" },
    row({ amount: 10, type: "expense", payment_method: "credit_card" }),
  ),
  ok(
    "English payment method label maps to its key",
    { amount: "-10", payment_method: "Bank Transfer" },
    row({ amount: 10, type: "expense", payment_method: "bank_transfer" }),
  ),
  ok(
    "payment method key is kept",
    { amount: "-10", payment_method: "cash" },
    row({ amount: 10, type: "expense", payment_method: "cash" }),
  ),
  ok(
    "Hebrew combined label maps to bit_paybox",
    { amount: "-10", payment_method: "ביט/פייבוקס" },
    row({ amount: 10, type: "expense", payment_method: "bit_paybox" }),
  ),
  ok(
    "partial label is kept as a custom payment method",
    { amount: "-10", payment_method: "Bit" },
    row({ amount: 10, type: "expense", payment_method: "Bit" }),
  ),
];

export const CHOMESH_FIXTURES: NormalizeRowFixture[] = [
  ok("Hebrew yes", { amount: "10", is_chomesh: "כן" }, row({ amount: 10, type: "income", is_chomesh: true })),
  ok("English yes, any case", { amount: "10", is_chomesh: "YES" }, row({ amount: 10, type: "income", is_chomesh: true })),
  ok("string true", { amount: "10", is_chomesh: "True" }, row({ amount: 10, type: "income", is_chomesh: true })),
  ok("string 1", { amount: "10", is_chomesh: "1" }, row({ amount: 10, type: "income", is_chomesh: true })),
  ok("number 1", { amount: "10", is_chomesh: 1 }, row({ amount: 10, type: "income", is_chomesh: true })),
  ok("boolean true", { amount: "10", is_chomesh: true }, row({ amount: 10, type: "income", is_chomesh: true })),
  ok("boolean false", { amount: "10", is_chomesh: false }, row({ amount: 10, type: "income" })),
  ok("Hebrew no", { amount: "10", is_chomesh: "לא" }, row({ amount: 10, type: "income" })),
  ok("unknown marker", { amount: "10", is_chomesh: "x" }, row({ amount: 10, type: "income" })),
  ok("empty cell", { amount: "10", is_chomesh: "" }, row({ amount: 10, type: "income" })),
];

export const NORMALIZE_ROW_FIXTURE_GROUPS: Record<string, NormalizeRowFixture[]> = {
  "imported types": IMPORTED_TYPE_FIXTURES,
  "recognized-expense": RECOGNIZED_EXPENSE_FIXTURES,
  "special types": SPECIAL_TYPE_FIXTURES,
  "amount and sign inference": SIGN_INFERENCE_FIXTURES,
  currency: CURRENCY_FIXTURES,
  category: CATEGORY_FIXTURES,
  "payment method": PAYMENT_METHOD_FIXTURES,
  is_chomesh: CHOMESH_FIXTURES,
};
