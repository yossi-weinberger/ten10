export const HALACHA_LANDING_URL = "https://ten10-app.com/landing";
export const HALACHA_LANDING_DISPLAY = "ten10-app.com/landing";
export const HALACHA_CONTACT_EMAIL = "contact@ten10-app.com";

export type PrintHighlight = "highlight" | "important" | null;

export interface HalachaPrintBlock {
  title: string;
  body: string;
  number?: string;
  highlight?: PrintHighlight;
}

export interface HalachaPrintChapter {
  id: string;
  tabLabel: string;
  title: string;
  description: string;
  blocks: HalachaPrintBlock[];
}

export interface HalachaPrintModel {
  language: string;
  dir: "rtl" | "ltr";
  title: string;
  subtitle: string;
  bookletKind: string;
  practiceLabel: string;
  cautionLabel: string;
  printedOn: string;
  creditAuthor: string;
  creditApp: string;
  creditDetails: string;
  landingLabel: string;
  emailLabel: string;
  tocTitle: string;
  chapters: HalachaPrintChapter[];
}
