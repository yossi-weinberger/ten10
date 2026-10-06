// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enAuth from "../../../public/locales/en/auth.json";
import heAuth from "../../../public/locales/he/auth.json";

const trackProductEvent = vi.fn();
const platformState = { platform: "web" as "web" | "desktop" | "loading" };

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    onClick,
    className,
  }: {
    to: string;
    children: ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === "layout.learnMore" ? enAuth.layout.learnMore : key,
    i18n: { dir: () => "ltr" },
  }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: platformState.platform }),
}));

vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: (...args: unknown[]) => trackProductEvent(...args),
}));

import { AuthLearnMoreLink } from "./AuthLearnMoreLink";

describe("AuthLearnMoreLink", () => {
  beforeEach(() => {
    platformState.platform = "web";
    trackProductEvent.mockReset();
  });

  afterEach(cleanup);

  it("renders a same-tab link to /landing on web", () => {
    render(<AuthLearnMoreLink />);

    const link = screen.getByRole("link", { name: enAuth.layout.learnMore });
    expect(link.getAttribute("href")).toBe("/landing");
    expect(link.getAttribute("target")).toBeNull();
  });

  it("hides the link in the Tauri desktop build", () => {
    platformState.platform = "desktop";
    render(<AuthLearnMoreLink />);

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("fires the existing product analytics event on click", () => {
    render(<AuthLearnMoreLink />);

    fireEvent.click(
      screen.getByRole("link", { name: enAuth.layout.learnMore }),
    );

    expect(trackProductEvent).toHaveBeenCalledTimes(1);
    expect(trackProductEvent).toHaveBeenCalledWith("login_learn_more_clicked");
  });

  it("keeps Hebrew and English copy in the auth locale files", () => {
    expect(heAuth.layout.learnMore).toBe("למד עוד על Ten10");
    expect(enAuth.layout.learnMore).toBe("Learn more about Ten10");
  });
});
