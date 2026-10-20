/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { PrivacyPage } from "./PrivacyPage";
import { TermsPage } from "./TermsPage";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => <p {...props}>{children}</p>,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: React.PropsWithChildren<{ to: string; className?: string }>) => (
    <a href={props.to} className={props.className}>{children}</a>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
}));

vi.mock("@/hooks/useScrollAnimation", () => ({
  useScrollAnimation: () => ({
    ref: { current: null },
    isInView: true,
  }),
  fadeInUp: {},
}));

describe("Legal Pages", () => {
  it("PrivacyPage should not render raw i18n keys", () => {
    const { container } = render(<PrivacyPage />);
    const text = container.textContent || "";

    expect(text).not.toMatch(/\{\{.*\}\}/);
    expect(text).not.toMatch(/dataStorage\.web\.description/);
    expect(text).not.toMatch(/dataRetention\.item4/);
  });

  it("TermsPage should not render raw i18n keys", () => {
    const { container } = render(<TermsPage />);
    const text = container.textContent || "";

    expect(text).not.toMatch(/\{\{.*\}\}/);
  });
});
