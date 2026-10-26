// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach } from "vitest";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "rtl", language: "he" },
  }),
}));
import { intakeFunnel } from "@/lib/admin/ai-intake-funnel";
import { AdminAiFunnel } from "@/components/admin/AdminAiFunnel";

describe("AdminAiFunnel", () => {
  beforeEach(() => {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    });
  });

  it("shows saved as a share of all drafts, not of open drafts", () => {
    const funnel = intakeFunnel(
      { ready: 14, needs_review: 0, approved: 0, rejected: 1, committed: 20, reverted: 15 },
      { ai: 14, ai_auto: 0 },
    );

    render(
      <TooltipProvider>
        <AdminAiFunnel
          title="funnel"
          hint="hint"
          funnel={funnel}
          copy={{
            created: "created",
            open: "open",
            rejected: "rejected",
            saved: "saved",
            undone: "undone",
            kept: "kept",
            existing: "existing",
            existingTip: "tip",
            auto: "auto",
            ofPrevious: (percent) => `${percent}%`,
            ofTotal: (percent) => `${percent}% of total`,
          }}
        />
      </TooltipProvider>,
    );

    expect(screen.getAllByText("70%").length).toBeGreaterThan(0);
    expect(screen.queryByText("250%")).toBeNull();
  });
});
