export interface EncouragementRow {
  contentId?: string;
  body?: string;
  source?: string;
}

export interface EmailLocale {
  monthlyEncouragements: EncouragementRow[];
}

export interface InspirationItem {
  id: string;
  type: string | null;
  title: string;
  body: string;
  source: string;
  title_en?: string;
  body_en?: string;
  source_en?: string;
}

export function masterBlocks(text: string): string[];

export function fieldBacktick(block: string, key: string): string | null;

export function fieldPlain(block: string, key: string): string | null;

export function fieldContent(block: string): string;

export function inspirationItemsFromSources(sources: {
  masterText: string;
  emailHe: EmailLocale;
  emailEn: EmailLocale;
}): InspirationItem[];

export function readInspirationSources(root: string): {
  masterText: string;
  emailHe: EmailLocale;
  emailEn: EmailLocale;
};
