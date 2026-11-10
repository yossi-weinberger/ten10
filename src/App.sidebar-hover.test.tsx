/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import App from "./App";

// Mock export-pdf modules to avoid font import errors
vi.mock("@/lib/utils/export-pdf", () => ({
  exportTransactionsToPDF: vi.fn(),
}));
vi.mock("@/lib/analytics/export-pdf", () => ({
  exportMonthlyChartToPDF: vi.fn(),
}));
vi.mock("@/lib/halacha/export-halacha-pdf", () => ({
  exportHalachaPDF: vi.fn(),
}));

// Mock all the dependencies
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { 
      language: "en",
      dir: () => "ltr",
      changeLanguage: vi.fn()
    },
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useRouterState: () => ({ location: { pathname: "/dashboard" } }),
  Outlet: () => <div>Outlet</div>,
}));

vi.mock("./contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("./contexts/TWAContext", () => ({
  useTWA: () => ({ isTWA: false }),
}));

vi.mock("./contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "123" } }),
}));

vi.mock("./lib/theme", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

vi.mock("./hooks/useSettingsSync", () => ({
  useSettingsSync: () => {},
}));

vi.mock("./hooks/useDesktopUpdateCheck", () => ({
  useDesktopUpdateCheck: () => {},
}));

vi.mock("./hooks/use-media-query", () => ({
  useMediaQuery: (query: string) => {
    // Desktop sidebar visible on md+
    if (query === "(min-width: 768px)") return true;
    return false;
  },
}));

vi.mock("./lib/store", () => ({
  useDonationStore: (selector?: (state: unknown) => unknown) => {
    const state = {
      settings: { language: "en", theme: "light" },
      _hasHydrated: true,
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

vi.mock("./lib/ai/ai-access", () => ({
  useMyAiAccess: () => {},
}));

vi.mock("./lib/ai/flags", () => ({
  useAiIntakeUi: () => false,
}));

vi.mock("./components/layout/Sidebar", () => ({
  Sidebar: ({ expanded }: { expanded: boolean }) => (
    <div data-testid="sidebar" data-expanded={expanded}>
      Sidebar {expanded ? "expanded" : "collapsed"}
    </div>
  ),
}));

vi.mock("./components/ai-intake/AssistantFab", () => ({
  AssistantFab: () => null,
}));

vi.mock("./components/auth/TermsAcceptanceModal", () => ({
  TermsAcceptanceModal: () => null,
}));

vi.mock("./components/WhatsNewModal", () => ({
  WhatsNewModal: () => null,
}));

vi.mock("./components/OptInPromptDialog", () => ({
  OptInPromptDialog: () => null,
}));

vi.mock("./components/onboarding/OnboardingHost", () => ({
  OnboardingHost: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/pages/landing/sections/Footer", () => ({
  Footer: () => null,
}));

describe("Sidebar hover behavior with assistant panel", () => {
  beforeEach(() => {
    // Clean up any data attributes from previous tests
    delete document.documentElement.dataset.assistantPanel;
  });

  it("should expand sidebar on hover when assistant panel is closed", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Get all sidebars and find the desktop one (not in Sheet)
    const sidebars = screen.getAllByTestId("sidebar");
    const desktopSidebar = sidebars.find(s => {
      // Desktop sidebar is in a div with "md:block" class
      const wrapper = s.parentElement;
      return wrapper?.className.includes("md:block");
    });
    
    if (!desktopSidebar) throw new Error("Desktop sidebar not found");
    
    // Initially collapsed
    expect(desktopSidebar).toHaveAttribute("data-expanded", "false");

    // Find the wrapper div that has the hover handler
    const sidebarWrapper = desktopSidebar.parentElement!;
    
    // Hover over the sidebar wrapper
    await user.hover(sidebarWrapper);

    // Should expand
    expect(desktopSidebar).toHaveAttribute("data-expanded", "true");

    // Unhover
    await user.unhover(sidebarWrapper);

    // Should collapse
    expect(desktopSidebar).toHaveAttribute("data-expanded", "false");
  });

  it("should NOT expand sidebar on hover when assistant panel is open", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Simulate assistant panel being open
    document.documentElement.dataset.assistantPanel = "open";

    // Get all sidebars and find the desktop one (not in Sheet)
    const sidebars = screen.getAllByTestId("sidebar");
    const desktopSidebar = sidebars.find(s => {
      const wrapper = s.parentElement;
      return wrapper?.className.includes("md:block");
    });
    
    if (!desktopSidebar) throw new Error("Desktop sidebar not found");
    
    // Initially collapsed
    expect(desktopSidebar).toHaveAttribute("data-expanded", "false");

    // Find the wrapper div that has the hover handler
    const sidebarWrapper = desktopSidebar.parentElement!;
    
    // Hover over the sidebar wrapper (simulating hover inside the assistant panel)
    await user.hover(sidebarWrapper);

    // Should NOT expand when panel is open
    expect(desktopSidebar).toHaveAttribute("data-expanded", "false");

    // Clean up
    delete document.documentElement.dataset.assistantPanel;
  });

  it("should still respond to mouse leave even when panel is open", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Get all sidebars and find the desktop one (not in Sheet)
    const sidebars = screen.getAllByTestId("sidebar");
    const desktopSidebar = sidebars.find(s => {
      const wrapper = s.parentElement;
      return wrapper?.className.includes("md:block");
    });
    
    if (!desktopSidebar) throw new Error("Desktop sidebar not found");
    const sidebarWrapper = desktopSidebar.parentElement!;

    // First expand the sidebar (panel closed)
    await user.hover(sidebarWrapper);
    expect(desktopSidebar).toHaveAttribute("data-expanded", "true");

    // Now open the panel
    document.documentElement.dataset.assistantPanel = "open";

    // Mouse leave should still collapse
    await user.unhover(sidebarWrapper);
    expect(desktopSidebar).toHaveAttribute("data-expanded", "false");

    // Clean up
    delete document.documentElement.dataset.assistantPanel;
  });
});
