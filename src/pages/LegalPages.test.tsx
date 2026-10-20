/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PrivacyPage } from "./PrivacyPage";
import { TermsPage } from "./TermsPage";
import enPrivacy from "../../public/locales/en/privacy.json";
import hePrivacy from "../../public/locales/he/privacy.json";
import enTerms from "../../public/locales/en/terms.json";
import heTerms from "../../public/locales/he/terms.json";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <p {...props}>{children}</p>,
  },
}));

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ to: string; className?: string }>) => (
    <a href={props.to} className={props.className}>{children}</a>
  ),
}));

// Mock react-i18next
const mockT = (key: string) => key;
const mockI18n = {
  language: "en",
  dir: () => "ltr",
};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: mockI18n,
  }),
}));

// Mock hooks
vi.mock("@/hooks/useScrollAnimation", () => ({
  useScrollAnimation: () => ({
    ref: { current: null },
    isInView: true,
  }),
  fadeInUp: {},
}));

describe("Legal Pages - i18n keys validation", () => {
  it("PrivacyPage should not render raw i18n keys", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent || "";

    // Check for common patterns of missing translations
    const rawKeyPatterns = [
      /dataStorage\.web\.description/,
      /dataRetention\.item4/,
      /\{\{.*\}\}/, // template literals
    ];

    rawKeyPatterns.forEach((pattern) => {
      expect(text).not.toMatch(pattern);
    });

    // Verify that specific new keys are being used (will show as raw keys in test)
    expect(text).toContain("dataStorage.web.location");
    expect(text).toContain("dataStorage.web.encryption");
    expect(text).toContain("dataStorage.web.rls");
    expect(text).toContain("dataStorage.web.access");
    expect(text).toContain("internationalTransfer.item4");
    expect(text).toContain("internationalTransfer.item5");
    expect(text).toContain("internationalTransfer.item6");
    expect(text).toContain("internationalTransfer.financialDataNote");
    expect(text).toContain("dataUsage.item5");
    expect(text).toContain("dataUsage.item6");
    expect(text).toContain("userRights.item6");
    expect(text).toContain("userRights.item7");
  });

  it("TermsPage should not render raw i18n keys", () => {
    const { container } = render(<TermsPage />);
    const text = container.textContent || "";

    // Verify that new keys are being used
    expect(text).toContain("communications.signupNotice");
    expect(text).toContain("communications.materialChanges");
  });

  it("Privacy JSON files should have all required keys in both languages", () => {
    const enKeys = new Set(Object.keys(enPrivacy));
    const heKeys = new Set(Object.keys(hePrivacy));

    // Check that both have the same top-level keys
    expect(heKeys).toEqual(enKeys);

    // Verify specific new keys exist
    expect(enPrivacy.dataCollection).toHaveProperty("required");
    expect(enPrivacy.dataCollection).toHaveProperty("optional");
    expect(hePrivacy.dataCollection).toHaveProperty("required");
    expect(hePrivacy.dataCollection).toHaveProperty("optional");

    expect(enPrivacy.dataStorage.web).toHaveProperty("location");
    expect(enPrivacy.dataStorage.web).toHaveProperty("encryption");
    expect(enPrivacy.dataStorage.web).toHaveProperty("rls");
    expect(enPrivacy.dataStorage.web).toHaveProperty("access");
    expect(hePrivacy.dataStorage.web).toHaveProperty("location");
    expect(hePrivacy.dataStorage.web).toHaveProperty("encryption");
    expect(hePrivacy.dataStorage.web).toHaveProperty("rls");
    expect(hePrivacy.dataStorage.web).toHaveProperty("access");

    expect(enPrivacy.internationalTransfer).toHaveProperty("item4");
    expect(enPrivacy.internationalTransfer).toHaveProperty("item5");
    expect(enPrivacy.internationalTransfer).toHaveProperty("item6");
    expect(enPrivacy.internationalTransfer).toHaveProperty("financialDataNote");
    expect(hePrivacy.internationalTransfer).toHaveProperty("item4");
    expect(hePrivacy.internationalTransfer).toHaveProperty("item5");
    expect(hePrivacy.internationalTransfer).toHaveProperty("item6");
    expect(hePrivacy.internationalTransfer).toHaveProperty("financialDataNote");

    expect(enPrivacy.dataUsage).toHaveProperty("item5");
    expect(enPrivacy.dataUsage).toHaveProperty("item6");
    expect(hePrivacy.dataUsage).toHaveProperty("item5");
    expect(hePrivacy.dataUsage).toHaveProperty("item6");

    expect(enPrivacy.userRights).toHaveProperty("item6");
    expect(enPrivacy.userRights).toHaveProperty("item7");
    expect(hePrivacy.userRights).toHaveProperty("item6");
    expect(hePrivacy.userRights).toHaveProperty("item7");
  });

  it("Terms JSON files should have all required keys in both languages", () => {
    const enKeys = new Set(Object.keys(enTerms));
    const heKeys = new Set(Object.keys(heTerms));

    expect(heKeys).toEqual(enKeys);

    expect(enTerms.communications).toHaveProperty("signupNotice");
    expect(enTerms.communications).toHaveProperty("materialChanges");
    expect(heTerms.communications).toHaveProperty("signupNotice");
    expect(heTerms.communications).toHaveProperty("materialChanges");
  });

  it("Footer should not interpolate year (uses static text)", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent || "";

    // Should NOT contain interpolation
    expect(text).not.toContain("{{");
    expect(text).not.toContain("}}");
    
    // Should render the footer key
    expect(text).toContain("footer");
  });
});
