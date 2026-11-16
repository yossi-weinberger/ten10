import raw from "./inspiration-library.json";

export interface InspirationRecord {
  id: string;
  type: string;
  title: string;
  body: string;
  source: string;
  title_en?: string;
  body_en?: string;
  source_en?: string;
}

export const INSPIRATION_LIBRARY = raw as InspirationRecord[];
