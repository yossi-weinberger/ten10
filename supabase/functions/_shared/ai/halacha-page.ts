/**
 * Picks one published halacha page. The answer text stays in the locale files.
 * A personal ruling is not a page match.
 */

import {
  HALACHA_CHOMESH_MARKERS,
  HALACHA_EXPENSES_MARKERS,
  HALACHA_INCOME_MARKERS,
  HALACHA_TITHE_MARKERS,
  PERSONAL_PSAK_MARKERS,
  includesAlias,
} from "./phrase-aliases.ts";

export const HALACHA_PAGES = [
  { id: "expenses", namespace: "halacha-expenses", markers: HALACHA_EXPENSES_MARKERS },
  { id: "chomesh", namespace: "halacha-chomesh", markers: HALACHA_CHOMESH_MARKERS },
  { id: "income", namespace: "halacha-income", markers: HALACHA_INCOME_MARKERS },
  { id: "tithes", namespace: "halacha-tithes", markers: HALACHA_TITHE_MARKERS },
] as const;

export type HalachaPageId = (typeof HALACHA_PAGES)[number]["id"];
export type HalachaPage = (typeof HALACHA_PAGES)[number];

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
}

export function selectHalachaPage(text: string): HalachaPage | null {
  const normalized = normalize(text);
  if (includesAlias(normalized, PERSONAL_PSAK_MARKERS)) return null;
  return HALACHA_PAGES.find((page) => includesAlias(normalized, page.markers)) ?? null;
}
