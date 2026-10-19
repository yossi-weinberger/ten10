// Stable category keys and the label aliases used when translations are present.
// Display labels stay in src (i18n). The app importer still resolves labels
// through i18n so a missing transactions bundle leaves them as custom text.

export const INCOME_CATEGORY_KEYS = [
  "salary",
  "business",
  "freelance",
  "investment",
  "allowance",
  "gift",
  "other",
] as const;

export const EXPENSE_CATEGORY_KEYS = [
  "food",
  "transportation",
  "housing",
  "utilities",
  "healthcare",
  "education",
  "leisure",
  "shopping",
  "other",
] as const;

export type IncomeCategoryKey = (typeof INCOME_CATEGORY_KEYS)[number];
export type ExpenseCategoryKey = (typeof EXPENSE_CATEGORY_KEYS)[number];
export type PredefinedCategoryKey = IncomeCategoryKey | ExpenseCategoryKey;

type CategoryBaseType = "income" | "expense";

export const CATEGORY_KEYS_BY_TYPE: Record<
  CategoryBaseType,
  readonly string[]
> = {
  income: INCOME_CATEGORY_KEYS,
  expense: EXPENSE_CATEGORY_KEYS,
};

const ALL_PREDEFINED_KEYS = new Set<string>([
  ...INCOME_CATEGORY_KEYS,
  ...EXPENSE_CATEGORY_KEYS,
]);

export function isPredefinedCategory(
  value: string | null | undefined,
): value is PredefinedCategoryKey {
  return !!value && ALL_PREDEFINED_KEYS.has(value);
}

const CATEGORY_LABELS: {
  he: {
    income: Record<IncomeCategoryKey, string>;
    expense: Record<ExpenseCategoryKey, string>;
  };
  en: {
    income: Record<IncomeCategoryKey, string>;
    expense: Record<ExpenseCategoryKey, string>;
  };
} = {
  he: {
    income: {
      salary: "משכורת",
      business: "עסק",
      freelance: "עבודה עצמאית",
      investment: "השקעות",
      allowance: "קצבאות",
      gift: "מתנה",
      other: "אחר",
    },
    expense: {
      food: "מזון",
      transportation: "תחבורה",
      housing: "דיור",
      utilities: "שירותים",
      healthcare: "בריאות",
      education: "חינוך",
      leisure: "פנאי",
      shopping: "קניות",
      other: "אחר",
    },
  },
  en: {
    income: {
      salary: "Salary",
      business: "Business",
      freelance: "Freelance",
      investment: "Investment",
      allowance: "Allowance",
      gift: "Gift",
      other: "Other",
    },
    expense: {
      food: "Food",
      transportation: "Transportation",
      housing: "Housing",
      utilities: "Utilities",
      healthcare: "Healthcare",
      education: "Education",
      leisure: "Leisure",
      shopping: "Shopping",
      other: "Other",
    },
  },
};

function buildCategoryAliasMap(): Map<string, string> {
  const map = new Map<string, string>();
  const langs = ["he", "en"] as const;
  const types: CategoryBaseType[] = ["income", "expense"];

  for (const lang of langs) {
    for (const type of types) {
      const labels = CATEGORY_LABELS[lang][type];
      for (const key of CATEGORY_KEYS_BY_TYPE[type]) {
        const translated = labels[key as keyof typeof labels];
        if (!translated) continue;
        const mapKey = `${lang}:${translated.toLowerCase()}`;
        if (!map.has(mapKey)) {
          map.set(mapKey, key);
        }
      }
    }
  }

  return map;
}

const CATEGORY_ALIAS_MAP = buildCategoryAliasMap();

/** Pure label → key mapping. Same lookup order as the i18n-backed normalizer. */
export function normalizeCategoryAlias(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (isPredefinedCategory(value)) return value;

  const trimmed = value.trim();
  for (const lang of ["he", "en"] as const) {
    const normalized = CATEGORY_ALIAS_MAP.get(`${lang}:${trimmed.toLowerCase()}`);
    if (normalized) return normalized;
  }

  return value;
}

/** Hebrew and English labels for a predefined key. Custom text is returned as itself. */
export function categoryCriterion(base: CategoryBaseType, key: string): string {
  const labels = CATEGORY_LABELS.he[base];
  const english = CATEGORY_LABELS.en[base];
  const he = labels[key as keyof typeof labels];
  const en = english[key as keyof typeof english];
  if (he && en) return `${he} (${en})`;
  return key.slice(0, 120);
}
