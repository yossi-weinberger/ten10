/**
 * Published halacha pages. The answer text stays in the locale files.
 */

export const HALACHA_PAGES = [
  { id: "expenses", namespace: "halacha-expenses" },
  { id: "chomesh", namespace: "halacha-chomesh" },
  { id: "income", namespace: "halacha-income" },
  { id: "tithes", namespace: "halacha-tithes" },
] as const;

export type HalachaPageId = (typeof HALACHA_PAGES)[number]["id"];
export type HalachaPage = (typeof HALACHA_PAGES)[number];

export function halachaNamespace(id: string): string | null {
  return HALACHA_PAGES.find((page) => page.id === id)?.namespace ?? null;
}
