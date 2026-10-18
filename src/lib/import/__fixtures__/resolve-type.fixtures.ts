// Characterization fixtures for resolveTypeWithIssues. Pure data, no `@/`
// imports, so they can move to supabase/functions/_shared unchanged.

export interface ResolveTypeFixture {
  name: string;
  params: {
    amount: number;
    fromDebitCredit?: boolean;
    debitValue?: number | null;
    creditValue?: number | null;
    rawType?: string | null;
    description?: string | null;
    category?: string | null;
    recipient?: string | null;
    paymentMethod?: string | null;
  };
  expected: {
    type: string;
    issues: { code: string }[];
  };
}

function fixture(
  name: string,
  params: ResolveTypeFixture["params"],
  type: string,
  issues: { code: string }[] = [],
): ResolveTypeFixture {
  return { name, params, expected: { type, issues } };
}

const KEYWORD_MATCH = [{ code: "income_keyword_match" }];

export const RESOLVE_TYPE_ALIAS_FIXTURES: ResolveTypeFixture[] = [
  fixture("en income", { amount: -1, rawType: "income" }, "income"),
  fixture("en credit", { amount: -1, rawType: "credit" }, "income"),
  fixture("he income", { amount: -1, rawType: "הכנסה" }, "income"),
  fixture("he credit", { amount: -1, rawType: "זיכוי" }, "income"),
  fixture("en expense", { amount: 1, rawType: "expense" }, "expense"),
  fixture("en debit", { amount: 1, rawType: "debit" }, "expense"),
  fixture("he expense", { amount: 1, rawType: "הוצאה" }, "expense"),
  fixture("he debit", { amount: 1, rawType: "חיוב" }, "expense"),
  fixture("en donation", { amount: 1, rawType: "donation" }, "donation"),
  fixture("en charity", { amount: 1, rawType: "charity" }, "donation"),
  fixture("en tzedaka", { amount: 1, rawType: "tzedaka" }, "donation"),
  fixture("he donation", { amount: 1, rawType: "תרומה" }, "donation"),
  fixture("he tzedaka", { amount: 1, rawType: "צדקה" }, "donation"),
  fixture("en recognized expense", { amount: 1, rawType: "recognized expense" }, "recognized-expense"),
  fixture("en business expense", { amount: 1, rawType: "business expense" }, "recognized-expense"),
  fixture("en expense against income", { amount: 1, rawType: "expense against income" }, "recognized-expense"),
  fixture("he recognized expense", { amount: 1, rawType: "הוצאה מוכרת" }, "recognized-expense"),
  fixture("he expense against income", { amount: 1, rawType: "הוצאה כנגד הכנסה" }, "recognized-expense"),
  fixture("alias match trims and ignores case", { amount: 1, rawType: "  EXPENSE  " }, "expense"),
];

export const RESOLVE_TYPE_FALLBACK_FIXTURES: ResolveTypeFixture[] = [
  fixture("no type, positive", { amount: 5 }, "income"),
  fixture("no type, negative", { amount: -5 }, "expense"),
  fixture("empty type string, negative", { amount: -5, rawType: "" }, "expense"),
  fixture("recognized-expense key itself is not an alias", { amount: 5, rawType: "recognized-expense" }, "income"),
  fixture("exempt-income is not an alias", { amount: -5, rawType: "exempt-income" }, "expense"),
  fixture("non_tithe_donation is not an alias", { amount: 5, rawType: "non_tithe_donation" }, "income"),
  fixture("initial_balance is not an alias", { amount: -5, rawType: "initial_balance" }, "expense"),
  fixture("רגילה is recognized but non-importable", { amount: -5, rawType: "רגילה" }, "expense"),
  fixture("unknown type", { amount: -5, rawType: "standing order" }, "expense"),
  fixture(
    "debit/credit flags do not affect the result, only the amount sign does",
    { amount: 5, fromDebitCredit: true, debitValue: 100, creditValue: null },
    "income",
  ),
];

export const RESOLVE_TYPE_KEYWORD_FIXTURES: ResolveTypeFixture[] = [
  fixture("he keyword in description", { amount: -5, description: "תשלום ביטוח לאומי" }, "income", KEYWORD_MATCH),
  fixture("en keyword, any case", { amount: -5, description: "KOLLEL stipend" }, "income", KEYWORD_MATCH),
  fixture("keyword in recipient", { amount: -5, recipient: "Bituach Leumi" }, "income", KEYWORD_MATCH),
  fixture("keyword in payment method", { amount: -5, paymentMethod: "salary account" }, "income", KEYWORD_MATCH),
  fixture("keyword in category", { amount: -5, category: "עבודה עצמאית" }, "income", KEYWORD_MATCH),
  fixture("keyword is a substring match", { amount: -5, description: "network fee" }, "income", KEYWORD_MATCH),
  fixture(
    "keyword inside an unknown type string",
    { amount: -5, rawType: "work transfer" },
    "income",
    KEYWORD_MATCH,
  ),
  fixture("keyword ignored for a positive amount", { amount: 5, description: "salary" }, "income"),
  fixture("explicit alias wins over keyword", { amount: -5, rawType: "expense", description: "salary" }, "expense"),
];
