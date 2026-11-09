import i18n from "@/lib/i18n";
import {
  CATEGORY_KEYS_BY_TYPE,
  isPredefinedCategory,
} from "../../supabase/functions/_shared/transaction-domain/category-keys.ts";

export {
  CATEGORY_KEYS_BY_TYPE,
  EXPENSE_CATEGORY_KEYS,
  INCOME_CATEGORY_KEYS,
  isPredefinedCategory,
  type ExpenseCategoryKey,
  type IncomeCategoryKey,
  type PredefinedCategoryKey,
} from "../../supabase/functions/_shared/transaction-domain/category-keys.ts";

// Donations: categories are NOT supported for donation transactions.
// Donations use the recipient field instead. Labels stay in i18n.

// ---------------------------------------------------------------------------
// formatCategory
// Resolves a stored category value to a localized label.
// - If the value is a known predefined key, returns the i18n label for the
//   given base type and current language.
// - If the value is a custom (free-text) category, returns it as-is.
// - If the value is null/empty, returns the provided fallback.
// ---------------------------------------------------------------------------
export function formatCategory(
  baseType: "income" | "expense" | undefined | null,
  value: string | null | undefined,
  currentLanguage: string,
  fallback = ""
): string {
  if (!value) return fallback;

  if (!isPredefinedCategory(value)) {
    return value;
  }

  const typesToTry: Array<"income" | "expense"> = baseType
    ? [baseType, ...(["income", "expense"] as const).filter((t) => t !== baseType)]
    : ["income", "expense"];

  for (const type of typesToTry) {
    const keys = CATEGORY_KEYS_BY_TYPE[type] as readonly string[];
    if (keys.includes(value)) {
      const translated = i18n.t(
        `transactionForm.category.${type}.${value}`,
        { lng: currentLanguage, ns: "transactions" }
      );
      if (translated && translated !== `transactionForm.category.${type}.${value}`) {
        return translated;
      }
    }
  }

  return value;
}

// ---------------------------------------------------------------------------
// normalizeCategoryValue
// Maps a known localized label (Hebrew or English) for a predefined category
// back to its stable key. Used during import/migration.
// Unknown values are returned unchanged (custom categories).
// ---------------------------------------------------------------------------

function buildNormalizationMap(): Map<string, string> {
  const map = new Map<string, string>();
  const langs = ["he", "en"];
  const types: Array<"income" | "expense"> = ["income", "expense"];

  for (const lang of langs) {
    for (const type of types) {
      const keys = CATEGORY_KEYS_BY_TYPE[type] as readonly string[];
      for (const key of keys) {
        const translated = i18n.t(
          `transactionForm.category.${type}.${key}`,
          { lng: lang, ns: "transactions" }
        );
        if (translated && translated !== `transactionForm.category.${type}.${key}`) {
          const mapKey = `${lang}:${translated.toLowerCase()}`;
          if (!map.has(mapKey)) {
            map.set(mapKey, key);
          }
        }
      }
    }
  }

  return map;
}

let _normalizationMap: Map<string, string> | null = null;

function getNormalizationMap(): Map<string, string> {
  if (!_normalizationMap) {
    _normalizationMap = buildNormalizationMap();
  }
  return _normalizationMap;
}

export function normalizeCategoryValue(
  value: string | null | undefined
): string | null {
  if (!value) return null;

  if (isPredefinedCategory(value)) return value;

  const map = getNormalizationMap();
  const trimmed = value.trim();

  for (const lang of ["he", "en"]) {
    const normalized = map.get(`${lang}:${trimmed.toLowerCase()}`);
    if (normalized) return normalized;
  }

  return value;
}
