// Single source for import parsing strings. Previously duplicated in
// public/locales/{en,he}/import.json and read by import-locale-aliases.ts.

export const PARSING_FIELD_KEYS = [
  "date",
  "amount",
  "debit",
  "credit",
  "description",
  "currency",
  "type",
  "category",
  "recipient",
  "payment_method",
  "is_chomesh",
] as const;

export type ParsingField = (typeof PARSING_FIELD_KEYS)[number];

type ImportAliasType = "income" | "expense" | "donation" | "recognized-expense";

interface LocaleParsing {
  typeAliases: Record<ImportAliasType, readonly string[]>;
  incomeDescriptionKeywords: readonly string[];
  booleanTruthy: readonly string[];
  templateColumnLabels: Partial<Record<ParsingField, string>>;
  columnAliases: Record<ParsingField, readonly string[]>;
  templateSamples: readonly Record<string, string>[];
}

const PARSING_EN = {
  typeAliases: {
    income: ["income", "credit"],
    expense: ["expense", "debit"],
    donation: ["donation", "charity", "tzedaka"],
    "recognized-expense": [
      "recognized expense",
      "business expense",
      "expense against income",
    ],
  },
  incomeDescriptionKeywords: [
    "kollel",
    "national insurance",
    "bituach leumi",
    "salary",
    "work",
  ],
  booleanTruthy: ["yes", "true", "1"],
  templateColumnLabels: {
    date: "date",
    amount: "amount",
    description: "description",
    currency: "currency",
    type: "type",
    category: "category",
    recipient: "recipient",
    payment_method: "payment_method",
    is_chomesh: "is_chomesh",
  },
  columnAliases: {
    date: ["date", "datum", "fecha", "data"],
    amount: ["amount", "sum", "total", "value"],
    debit: ["debit", "charge", "withdrawal", "deductions"],
    credit: ["credit", "deposit", "income credit"],
    description: ["description", "details", "note", "memo", "desc"],
    currency: ["currency", "cur"],
    type: ["type", "category type", "transaction type"],
    category: ["category", "cat", "group"],
    recipient: ["recipient", "payee", "beneficiary"],
    payment_method: ["payment", "method", "payment method"],
    is_chomesh: ["is_chomesh", "chomesh", "chomesh?"],
  },
  templateSamples: [
    {
      date: "2025-01-15",
      amount: "5000",
      description: "Monthly salary",
      currency: "ILS",
      type: "income",
      category: "salary",
      recipient: "",
      payment_method: "bank_transfer",
      is_chomesh: "no",
    },
    {
      date: "2025-01-20",
      amount: "-350",
      description: "Grocery shopping",
      currency: "ILS",
      type: "expense",
      category: "food",
      recipient: "",
      payment_method: "credit_card",
      is_chomesh: "no",
    },
    {
      date: "2025-01-25",
      amount: "500",
      description: "Tzedaka",
      currency: "ILS",
      type: "donation",
      category: "",
      recipient: "Local synagogue",
      payment_method: "bank_transfer",
      is_chomesh: "yes",
    },
  ],
} satisfies LocaleParsing;

const PARSING_HE = {
  typeAliases: {
    income: ["הכנסה", "זיכוי"],
    expense: ["הוצאה", "חיוב"],
    donation: ["תרומה", "צדקה"],
    "recognized-expense": ["הוצאה כנגד הכנסה", "הוצאה מוכרת"],
  },
  incomeDescriptionKeywords: ["כולל אברכים", "ביטוח לאומי", "עבודה"],
  booleanTruthy: ["כן"],
  templateColumnLabels: {
    date: "תאריך",
    amount: "סכום",
    description: "תיאור",
    currency: "מטבע",
    type: "סוג",
    category: "קטגוריה",
    recipient: "נמען/משלם",
    payment_method: "אמצעי תשלום",
    is_chomesh: "חומש?",
  },
  columnAliases: {
    date: ["תאריך", "תאריך עסקה", "תאריך רכישה", "תאריך פעולה", "תאריך ערך"],
    amount: ["סכום", 'סה"כ', "שווי", "סכום עסקה", 'סכום בש"ח'],
    debit: ["חיוב", "חובה", "הוצאה", "סכום חיוב", "חיוב ₪", "משיכה"],
    credit: ["זיכוי", "זכות", "הכנסה", "סכום זיכוי", "זיכוי ₪", "הפקדה"],
    description: [
      "תיאור",
      "פרטים",
      "הערה",
      "שם",
      "הפעולה",
      "פעולה",
      "שם בית עסק",
      "שם בית העסק",
      "בית עסק",
      "מוטב",
      "נהנה",
      "תיאור הפעולה",
      "פרטי פעולה",
    ],
    currency: ["מטבע", "מטבע חיוב", "מטבע עסקה"],
    type: ["סוג", "סוג עסקה"],
    category: ["קטגוריה"],
    recipient: ["נמען", "מוטב", "גוף", "לטובת", "עבור", "שם מוטב", "נמען/משלם"],
    payment_method: ["אמצעי תשלום", "תשלום", "אמצעי"],
    is_chomesh: ["חומש", "חומש?"],
  },
  templateSamples: [
    {
      date: "2025-01-15",
      amount: "5000",
      description: "משכורת חודשית",
      currency: "ILS",
      type: "income",
      category: "salary",
      recipient: "",
      payment_method: "bank_transfer",
      is_chomesh: "לא",
    },
    {
      date: "2025-01-20",
      amount: "-350",
      description: "קניות סופרמרקט",
      currency: "ILS",
      type: "expense",
      category: "food",
      recipient: "",
      payment_method: "credit_card",
      is_chomesh: "לא",
    },
    {
      date: "2025-01-25",
      amount: "500",
      description: "צדקה",
      currency: "ILS",
      type: "donation",
      category: "",
      recipient: "בית הכנסת",
      payment_method: "bank_transfer",
      is_chomesh: "כן",
    },
  ],
} satisfies LocaleParsing;

const LOCALE_ENTRIES: readonly [string, LocaleParsing][] = [
  ["en", PARSING_EN],
  ["he", PARSING_HE],
];

const ALL_PARSING = LOCALE_ENTRIES.map(([, parsing]) => parsing);

export const TEMPLATE_COLUMN_LABELS: Record<
  string,
  Partial<Record<ParsingField, string>>
> = Object.fromEntries(
  LOCALE_ENTRIES.map(([lang, parsing]) => [lang, parsing.templateColumnLabels]),
);

export const FIELD_ALIASES: Record<ParsingField, string[]> = Object.fromEntries(
  PARSING_FIELD_KEYS.map((field) => [
    field,
    [
      ...new Set(
        ALL_PARSING.flatMap((parsing) => parsing.columnAliases[field] ?? []),
      ),
    ],
  ]),
) as Record<ParsingField, string[]>;

export const TYPE_LOCALE_ALIASES: Record<string, string | null> = {
  ...Object.fromEntries(
    ALL_PARSING.flatMap((parsing) =>
      Object.entries(parsing.typeAliases).flatMap(([type, aliases]) =>
        aliases.map((alias) => [alias.toLowerCase(), type]),
      ),
    ),
  ),
  // Ten10 self-export label for a plain transaction — not a real type.
  "רגילה": null,
};

export const INCOME_DESCRIPTION_KEYWORDS: readonly string[] = [
  ...new Set(
    ALL_PARSING.flatMap((parsing) => parsing.incomeDescriptionKeywords ?? []).map(
      (keyword) => keyword.toLowerCase(),
    ),
  ),
];

export const BOOLEAN_TRUTHY_VALUES: readonly string[] = [
  ...new Set(ALL_PARSING.flatMap((parsing) => parsing.booleanTruthy)),
];

export const SAMPLE_ROWS_BY_LANG: Record<string, Record<string, string>[]> =
  Object.fromEntries(
    LOCALE_ENTRIES.map(([lang, parsing]) => [
      lang,
      parsing.templateSamples.map((row) => ({ ...row })),
    ]),
  );
