// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { BetaTermsDialog } from "./BetaTermsDialog";
import he from "../../../public/locales/he/navigation.json";
import en from "../../../public/locales/en/navigation.json";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/hooks/use-media-query", () => ({
  COMPACT_VIEWPORT_QUERY: "(max-width: 767px), ((max-height: 500px) and (pointer: coarse))",
  useMediaQuery: () => true,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

type CopyI18n = I18n & {
  use: (plugin: unknown) => CopyI18n;
  init: (options: object) => Promise<unknown>;
  changeLanguage: (language: string) => Promise<unknown>;
};

const i18n = (i18next as unknown as { createInstance: () => CopyI18n }).createInstance();

const copy = {
  he: {
    title: "הסכמה לשימוש בבטא",
    description: "כדי להשתמש בעוזר ה-AI, עליך להסכים לתנאי השימוש הייחודיים של גרסת הבטא.",
    shortDescription: "השימוש בעוזר דורש הסכמה לתנאי הבטא. הנתונים שלך מוגנים ותוכל למחוק אותם בכל עת.",
    readFullTerms: "קרא את התנאים המלאים",
    acceptButton: "הפעל",
    declineButton: "לא עכשיו",
  },
  en: {
    title: "Beta Terms Consent",
    description: "To use the AI assistant, you must agree to the unique terms of the beta version.",
    shortDescription: "Using the assistant requires consent to beta terms. Your data is protected and you can delete it anytime.",
    readFullTerms: "Read the full terms",
    acceptButton: "Enable",
    declineButton: "Not Now",
  },
} as const;

describe("BetaTermsDialog rendered copy", () => {
  beforeAll(async () => {
    await i18n.use(initReactI18next).init({
      lng: "he",
      fallbackLng: "he",
      resources: {
        he: { navigation: he },
        en: { navigation: en },
      },
      ns: ["navigation"],
      defaultNS: "navigation",
      interpolation: { escapeValue: false },
    });
  });

  it.each(["he", "en"] as const)("renders %s consent strings instead of raw keys", async (language) => {
    cleanup();
    await i18n.changeLanguage(language);
    const strings = copy[language];

    render(
      <I18nextProvider i18n={i18n}>
        <BetaTermsDialog open onAccept={vi.fn()} onDecline={vi.fn()} />
      </I18nextProvider>,
    );

    expect(screen.getByRole("heading", { name: strings.title })).toBeInTheDocument();
    expect(screen.getByText(strings.description)).toBeInTheDocument();
    expect(screen.getByText(strings.shortDescription)).toBeInTheDocument();
    expect(screen.getByText(strings.readFullTerms)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: strings.acceptButton })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: strings.declineButton })).toBeInTheDocument();
    expect(screen.queryByText(/betaTerms\./)).not.toBeInTheDocument();
  });
});
