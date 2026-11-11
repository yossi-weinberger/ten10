// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BetaTermsDialog } from "./BetaTermsDialog";
import { supabase } from "@/lib/supabaseClient";
import { AI_BETA_TERMS_VERSION } from "@/lib/ai/beta-terms-version";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-id" } }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      dir: () => "ltr",
    },
  }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

describe("BetaTermsDialog", () => {
  const mockOnAccept = vi.fn();
  const mockOnDecline = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog when open", () => {
    render(
      <BetaTermsDialog
        open={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(screen.getByText("betaTerms.title")).toBeInTheDocument();
    expect(screen.getByText("betaTerms.readFullTerms")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "betaTerms.acceptButton" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "betaTerms.declineButton" })).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(
      <BetaTermsDialog
        open={false}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("calls accept_ai_beta_terms RPC with correct version and metadata when accepting", async () => {
    const mockRpc = vi.fn().mockResolvedValue({ data: {}, error: null });
    (supabase.rpc as unknown) = mockRpc;

    const user = userEvent.setup();
    render(
      <BetaTermsDialog
        open={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const acceptButton = screen.getByRole("button", { name: "betaTerms.acceptButton" });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("accept_ai_beta_terms", {
        p_version: AI_BETA_TERMS_VERSION,
        p_metadata: {
          platform: "web",
          locale: expect.any(String),
        },
      });
    });

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalled();
    });
  });

  it("shows loading state while accepting", async () => {
    let resolveRpc: () => void;
    const mockRpc = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRpc = () => resolve({ data: {}, error: null });
        })
    );
    (supabase.rpc as unknown) = mockRpc;

    const user = userEvent.setup();
    render(
      <BetaTermsDialog
        open={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const acceptButton = screen.getByRole("button", { name: "betaTerms.acceptButton" });
    await user.click(acceptButton);

    expect(screen.getByRole("button", { name: "betaTerms.accepting" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "betaTerms.accepting" })).toBeDisabled();

    resolveRpc!();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "betaTerms.accepting" })).not.toBeInTheDocument();
    });
  });

  it("calls onDecline without calling RPC when declining", async () => {
    const mockRpc = vi.fn();
    (supabase.rpc as unknown) = mockRpc;

    const user = userEvent.setup();
    render(
      <BetaTermsDialog
        open={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const declineButton = screen.getByRole("button", { name: "betaTerms.declineButton" });
    await user.click(declineButton);

    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockOnDecline).toHaveBeenCalled();
    expect(mockOnAccept).not.toHaveBeenCalled();
  });

  it("handles RPC error gracefully", async () => {
    const mockRpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error("RPC failed") });
    (supabase.rpc as unknown) = mockRpc;

    const user = userEvent.setup();
    render(
      <BetaTermsDialog
        open={true}
        onAccept={mockOnAccept}
        onDecline={mockOnDecline}
      />
    );

    const acceptButton = screen.getByRole("button", { name: "betaTerms.acceptButton" });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalled();
    });

    expect(mockOnAccept).not.toHaveBeenCalled();
  });
});
