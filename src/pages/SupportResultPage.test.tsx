// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { SupportResultPage } from "./SupportResultPage";
import { PUBLIC_ROUTES } from "@/lib/constants";
import {
  SUPPORT_FAILED_PATH,
  SUPPORT_MERCHANT_NAME,
  SUPPORT_THANKS_PATH,
} from "@/lib/support-payment";
import he from "../../public/locales/he/support.json";
import en from "../../public/locales/en/support.json";

const session = vi.hoisted(() => ({
  user: null as { id: string } | null,
  loading: false,
  platform: "web" as "web" | "desktop",
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: session.user,
    loading: session.loading,
    session: session.user,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: session.platform }),
}));

type CopyI18n = I18n & {
  use: (plugin: unknown) => CopyI18n;
  init: (options: object) => Promise<unknown>;
  changeLanguage: (language: string) => Promise<unknown>;
};

const i18n = (i18next as unknown as { createInstance: () => CopyI18n }).createInstance();

function chargeSentence(language: "he" | "en"): string {
  const template = language === "he" ? he.chargeName : en.chargeName;
  return template.replace("{{merchant}}", SUPPORT_MERCHANT_NAME);
}

describe("SupportResultPage", () => {
  beforeAll(async () => {
    await i18n.use(initReactI18next).init({
      lng: "he",
      fallbackLng: "he",
      resources: {
        he: { support: he },
        en: { support: en },
      },
      ns: ["support"],
      defaultNS: "support",
      interpolation: { escapeValue: false },
    });
  });

  it("sends a logged-out web visitor home to the landing page", () => {
    session.user = null;
    session.loading = false;
    session.platform = "web";
    render(
      <I18nextProvider i18n={i18n}>
        <SupportResultPage outcome="thanks" />
      </I18nextProvider>,
    );
    expect(screen.getByText(he.backHome).closest("a")).toHaveAttribute("to", "/landing");
  });

  it("sends a signed-in visitor home to the app", async () => {
    cleanup();
    session.user = { id: "user-1" };
    session.platform = "web";
    render(
      <I18nextProvider i18n={i18n}>
        <SupportResultPage outcome="thanks" />
      </I18nextProvider>,
    );
    expect(screen.getByText(he.backHome).closest("a")).toHaveAttribute("to", "/");
  });

  it("keeps the return pages public", () => {
    expect(PUBLIC_ROUTES).toContain(SUPPORT_THANKS_PATH);
    expect(PUBLIC_ROUTES).toContain(SUPPORT_FAILED_PATH);
  });

  it.each(["he", "en"] as const)("shows the merchant on the %s thank-you page", async (language) => {
    cleanup();
    await i18n.changeLanguage(language);
    const copy = language === "he" ? he : en;

    render(
      <I18nextProvider i18n={i18n}>
        <SupportResultPage outcome="thanks" />
      </I18nextProvider>,
    );

    expect(screen.getByRole("heading", { name: copy.thanks.title })).toBeInTheDocument();
    expect(screen.getByText(chargeSentence(language))).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: copy.retry })).not.toBeInTheDocument();
  });

  it("offers another try after a failed payment", async () => {
    cleanup();
    await i18n.changeLanguage("he");
    render(
      <I18nextProvider i18n={i18n}>
        <SupportResultPage outcome="failed" />
      </I18nextProvider>,
    );

    expect(screen.getByRole("heading", { name: he.failed.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: he.retry })).toBeInTheDocument();
    expect(screen.queryByText(chargeSentence("he"))).not.toBeInTheDocument();
  });
});
