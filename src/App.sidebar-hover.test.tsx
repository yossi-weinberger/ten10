/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import App from "./App";

// Minimal mocks
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en", dir: () => "ltr", changeLanguage: vi.fn() } }),
}));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({ location: { pathname: "/dashboard" } }),
  Outlet: () => null,
}));
vi.mock("./contexts/PlatformContext", () => ({ usePlatform: () => ({ platform: "web" }) }));
vi.mock("./contexts/TWAContext", () => ({ useTWA: () => ({ isTWA: false }) }));
vi.mock("./contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "1" } }) }));
vi.mock("./lib/theme", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("./hooks/useSettingsSync", () => ({ useSettingsSync: () => {} }));
vi.mock("./hooks/useDesktopUpdateCheck", () => ({ useDesktopUpdateCheck: () => {} }));
vi.mock("./hooks/use-media-query", () => ({ useMediaQuery: () => true }));
vi.mock("./lib/store", () => ({
  useDonationStore: () => ({ settings: { language: "en", theme: "light" }, _hasHydrated: true }),
}));
vi.mock("./lib/ai/ai-access", () => ({ useMyAiAccess: () => {} }));
vi.mock("./lib/ai/flags", () => ({ useAiIntakeUi: () => false }));
vi.mock("./lib/utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));
vi.mock("./lib/analytics/export-pdf", () => ({ exportMonthlyChartToPDF: vi.fn() }));
vi.mock("./lib/halacha/export-halacha-pdf", () => ({ exportHalachaPDF: vi.fn() }));
vi.mock("./components/layout/Sidebar", () => ({
  Sidebar: ({ expanded }: { expanded: boolean }) => <div data-testid="sidebar" data-expanded={expanded} />,
}));
vi.mock("./components/ai-intake/AssistantFab", () => ({ AssistantFab: () => null }));
vi.mock("./components/auth/TermsAcceptanceModal", () => ({ TermsAcceptanceModal: () => null }));
vi.mock("./components/WhatsNewModal", () => ({ WhatsNewModal: () => null }));
vi.mock("./components/OptInPromptDialog", () => ({ OptInPromptDialog: () => null }));
vi.mock("./components/onboarding/OnboardingHost", () => ({
  OnboardingHost: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/pages/landing/sections/Footer", () => ({ Footer: () => null }));

describe("Sidebar hover with portaled children", () => {
  const getDesktopSidebar = () => {
    const sidebars = screen.getAllByTestId("sidebar");
    return sidebars.find(s => s.parentElement?.className.includes("md:block"));
  };

  it("ignores mouseenter from portaled child (assistant panel)", () => {
    render(<App />);
    const sidebar = getDesktopSidebar()!;
    const wrapper = sidebar.parentElement!;

    // Simulate mouseenter event where target is NOT inside wrapper (portaled content)
    const portaledElement = document.createElement("div");
    document.body.appendChild(portaledElement);
    
    // Create a proper event with currentTarget = wrapper but target = portaled element
    const event = new MouseEvent("mouseenter", { bubbles: false, cancelable: false });
    Object.defineProperty(event, "target", { value: portaledElement, enumerable: true });
    Object.defineProperty(event, "currentTarget", { value: wrapper, enumerable: true });
    wrapper.dispatchEvent(event);
    
    expect(sidebar).toHaveAttribute("data-expanded", "false");
    
    document.body.removeChild(portaledElement);
  });

  it("expands on mouseenter from wrapper's own DOM (panel open)", () => {
    render(<App />);
    document.documentElement.dataset.assistantPanel = "open";
    
    const sidebar = getDesktopSidebar()!;
    const wrapper = sidebar.parentElement!;
    
    fireEvent.mouseEnter(wrapper, { target: wrapper });
    expect(sidebar).toHaveAttribute("data-expanded", "true");
    
    delete document.documentElement.dataset.assistantPanel;
  });

  it("expands on mouseenter from wrapper's own DOM (panel closed)", () => {
    render(<App />);
    const sidebar = getDesktopSidebar()!;
    const wrapper = sidebar.parentElement!;
    
    fireEvent.mouseEnter(wrapper, { target: wrapper });
    expect(sidebar).toHaveAttribute("data-expanded", "true");
  });

  it("collapses on mouseleave", () => {
    render(<App />);
    const sidebar = getDesktopSidebar()!;
    const wrapper = sidebar.parentElement!;
    
    fireEvent.mouseEnter(wrapper, { target: wrapper });
    expect(sidebar).toHaveAttribute("data-expanded", "true");
    
    fireEvent.mouseLeave(wrapper);
    expect(sidebar).toHaveAttribute("data-expanded", "false");
  });
});
