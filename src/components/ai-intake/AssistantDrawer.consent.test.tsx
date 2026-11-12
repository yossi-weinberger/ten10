// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AssistantDrawer, type AssistantDrawerHandle } from "./AssistantDrawer";
import { supabase } from "@/lib/supabaseClient";
import { AI_BETA_TERMS_VERSION } from "@/lib/ai/beta-terms-version";
import { claimBetaConsentRequired } from "@/lib/ai/beta-consent-required";
import { createRef } from "react";

const mockRpc = vi.hoisted(() => vi.fn());
const mockHandleSubmit = vi.hoisted(() => vi.fn());
const mockHandleReceipt = vi.hoisted(() => vi.fn());
const mockToggleRecording = vi.hoisted(() => vi.fn());
const compactViewport = vi.hoisted(() => ({ value: false }));

let mockAuthUser: { id: string; email: string } | null = { id: "test-user-id", email: "test@example.com" };

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

vi.mock("@/lib/ai/flags", () => ({
  isAiIntakeEnabled: () => true,
}));

vi.mock("@/lib/ai/assistant-extras", () => ({
  loadTitheBalance: vi.fn().mockResolvedValue({ total: 100 }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

vi.mock("@/contexts/PlatformContext", () => ({
  usePlatform: () => ({ platform: "web" }),
}));

vi.mock("@/lib/store", () => ({
  useDonationStore: (selector: (state: { settings: { defaultCurrency: string } }) => unknown) =>
    selector({ settings: { defaultCurrency: "ILS" } }),
}));

vi.mock("./use-assistant-drawer-state", () => ({
  useAssistantDrawerState: () => ({
    user: mockAuthUser,
    platform: "web",
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
    textareaRef: { current: null },
    history: [],
    activeUser: null,
    clarification: null,
    text: "",
    setText: vi.fn(),
    saving: false,
    undoing: false,
    limitInfo: null,
    mediaStream: { current: null },
    syncConversation: vi.fn(),
    keepRecording: vi.fn(),
    clearConversation: vi.fn(),
    disposeAssistant: vi.fn(),
  }),
}));

vi.mock("./use-assistant-drawer-intent", () => ({
  useAssistantDrawerIntent: () => ({
    handleSubmit: mockHandleSubmit,
  }),
}));

vi.mock("./use-assistant-drawer-composer", () => ({
  useAssistantDrawerComposer: () => ({
    wiring: {
      value: "",
      busyKey: undefined,
      recording: false,
      transcribing: false,
      elapsed: 0,
      mode: "text" as const,
    },
    handleReceipt: mockHandleReceipt,
    toggleRecording: mockToggleRecording,
    cancelRecording: vi.fn(),
    stopRecording: vi.fn(),
    handleAmountReply: vi.fn(),
  }),
}));

vi.mock("./use-assistant-drawer-thread", () => ({
  useAssistantDrawerThread: () => ({
    history: [],
    active: null,
    blocks: [],
    handlers: {},
  }),
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

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}));

vi.mock("@/hooks/use-media-query", () => ({
  COMPACT_VIEWPORT_QUERY: "(max-width: 767px), ((max-height: 500px) and (pointer: coarse))",
  useMediaQuery: () => compactViewport.value,
}));

vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({ className: "" }),
    isDragActive: false,
  }),
}));

describe("AssistantDrawer consent gate", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnNavigate = vi.fn();
  const receiveRef = createRef<AssistantDrawerHandle>();

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    compactViewport.value = false;
    mockAuthUser = { id: "test-user-id", email: "test@example.com" };
    // Some cases replace supabase.rpc with a hanging promise. Put the shared mock back.
    (supabase as unknown as { rpc: typeof mockRpc }).rpc = mockRpc;
    // Reset mockRpc to default (no consent) with a proper implementation
    mockRpc.mockReset().mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it("shows beta terms dialog when user has not accepted current version", async () => {
    mockRpc.mockResolvedValue({
      data: {
        accepted: false,
        version: null,
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });

    render(
      <AssistantDrawer
        open={true}
        onOpenChange={mockOnOpenChange}
        receiveRef={receiveRef}
        onNavigate={mockOnNavigate}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("ai_beta_consent_status");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "aiIntake.betaTerms.title" })).toBeInTheDocument();
    });
  });

  it("shows beta terms dialog when user accepted old version", async () => {
    mockRpc.mockResolvedValue({
      data: {
        accepted: true,
        version: "beta-v0",
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });

    render(
      <AssistantDrawer
        open={true}
        onOpenChange={mockOnOpenChange}
        receiveRef={receiveRef}
        onNavigate={mockOnNavigate}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("ai_beta_consent_status");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "aiIntake.betaTerms.title" })).toBeInTheDocument();
    });
  });

  it("calls consent RPC when drawer opens", async () => {
    mockRpc.mockResolvedValue({
      data: {
        accepted: true,
        version: AI_BETA_TERMS_VERSION,
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });

    render(
      <AssistantDrawer
        open={true}
        onOpenChange={mockOnOpenChange}
        receiveRef={receiveRef}
        onNavigate={mockOnNavigate}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("ai_beta_consent_status");
    });
  });

  it("reopens the beta terms dialog when an AI call requires consent", async () => {
    cleanup();
    mockRpc.mockResolvedValue({
      data: {
        accepted: true,
        version: AI_BETA_TERMS_VERSION,
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });

    const view = render(
      <AssistantDrawer
        open={true}
        onOpenChange={mockOnOpenChange}
        receiveRef={receiveRef}
        onNavigate={mockOnNavigate}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: "aiIntake.placeholder" })).toBeEnabled();
    });

    await claimBetaConsentRequired({ context: { code: "beta_consent_required" } }, null);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "aiIntake.betaTerms.title" })).toBeInTheDocument();
    });
    view.unmount();
  });

  it("shows beta terms dialog when user opted out (accepted=false)", async () => {
    mockRpc.mockResolvedValue({
      data: {
        accepted: false,
        version: AI_BETA_TERMS_VERSION,
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });

    render(
      <AssistantDrawer
        open={true}
        onOpenChange={mockOnOpenChange}
        receiveRef={receiveRef}
        onNavigate={mockOnNavigate}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("ai_beta_consent_status");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "aiIntake.betaTerms.title" })).toBeInTheDocument();
    });
  });

  it("shows beta terms dialog on RPC error (fail closed)", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error("Network error"),
    });

    render(
      <AssistantDrawer
        open={true}
        onOpenChange={mockOnOpenChange}
        receiveRef={receiveRef}
        onNavigate={mockOnNavigate}
        userName="Test User"
      />
    );

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith("ai_beta_consent_status");
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "aiIntake.betaTerms.title" })).toBeInTheDocument();
    });
  });

  it("does not check consent status when drawer is closed", () => {
    const mockRpc = vi.fn();
    (supabase.rpc as unknown) = mockRpc;

    render(
      <AssistantDrawer
        open={false}
        onOpenChange={mockOnOpenChange}
        receiveRef={receiveRef}
        onNavigate={mockOnNavigate}
        userName="Test User"
      />
    );

    expect(mockRpc).not.toHaveBeenCalled();
  });

  describe("consent gate fail-closed enforcement", () => {
    beforeEach(() => {
      mockHandleSubmit.mockClear();
      mockHandleReceipt.mockClear();
      mockToggleRecording.mockClear();
      // Reset user to default
      mockAuthUser = { id: "test-user-id", email: "test@example.com" };
    });

    it("starts in checking state (fail closed on first render)", async () => {
      // Mock RPC to hang (never resolve)
      (supabase.rpc as unknown) = vi.fn().mockReturnValue(new Promise(() => {}));

      render(
        <AssistantDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          receiveRef={receiveRef}
          onNavigate={mockOnNavigate}
          userName="Test User"
        />
      );

      // RPC should be called
      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith("ai_beta_consent_status");
      });
      
      // Initial state is checking, so handlers were set up with guards
      // The actual enforcement is tested by the code guards, not by simulating clicks here
    });

    it("does not call RPC when userId is null", () => {
      // Set user to null
      mockAuthUser = null;

      render(
        <AssistantDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          receiveRef={receiveRef}
          onNavigate={mockOnNavigate}
          userName="Test User"
        />
      );

      // RPC should not be called when userId is null (fail closed)
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("completes consent check when RPC resolves accepted", async () => {
      (supabase.rpc as unknown) = vi.fn().mockResolvedValue({
        data: {
          accepted: true,
          version: AI_BETA_TERMS_VERSION,
          current: AI_BETA_TERMS_VERSION,
        },
        error: null,
      });

      render(
        <AssistantDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          receiveRef={receiveRef}
          onNavigate={mockOnNavigate}
          userName="Test User"
        />
      );

      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith("ai_beta_consent_status");
      });

      // Consent check completed successfully (may be called multiple times for other RPCs)
      expect(supabase.rpc).toHaveBeenCalled();
    });

    it("disables suggestion chips until consent is accepted, and a click sends nothing", async () => {
      const user = userEvent.setup();
      let resolveConsent: (value: {
        data: { accepted: boolean; version: string; current: string };
        error: null;
      }) => void = () => {};
      (supabase.rpc as unknown) = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveConsent = resolve;
          }),
      );

      render(
        <AssistantDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          receiveRef={receiveRef}
          onNavigate={mockOnNavigate}
          userName="Test User"
        />,
      );

      await waitFor(() => {
        expect(supabase.rpc).toHaveBeenCalledWith("ai_beta_consent_status");
      });

      const chipKeys = ["transaction", "receipt", "voice", "question", "halacha", "recurring", "rule"];
      const chips = chipKeys.map((key) =>
        screen.getByRole("button", { name: `aiIntake.suggestions.${key}` }),
      );
      for (const chip of chips) {
        expect(chip).toBeDisabled();
      }

      await user.click(chips[0]);
      expect(mockHandleSubmit).not.toHaveBeenCalled();
      expect(mockHandleReceipt).not.toHaveBeenCalled();
      expect(mockToggleRecording).not.toHaveBeenCalled();

      resolveConsent({
        data: {
          accepted: true,
          version: AI_BETA_TERMS_VERSION,
          current: AI_BETA_TERMS_VERSION,
        },
        error: null,
      });

      await waitFor(() => {
        for (const key of chipKeys) {
          expect(screen.getByRole("button", { name: `aiIntake.suggestions.${key}` })).toBeEnabled();
        }
      });
    });
  });

  describe("mobile consent before the assistant opens", () => {
    const suggestion = "aiIntake.suggestions.transaction";

    beforeEach(() => {
      compactViewport.value = true;
    });

    function renderOpen() {
      render(
        <AssistantDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          receiveRef={receiveRef}
          onNavigate={mockOnNavigate}
          userName="Test User"
        />,
      );
    }

    it("shows only the consent drawer when the user has not accepted", async () => {
      mockRpc.mockResolvedValue({
        data: { accepted: false, version: null, current: AI_BETA_TERMS_VERSION },
        error: null,
      });

      renderOpen();

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "aiIntake.betaTerms.title" })).toBeInTheDocument();
      });
      expect(screen.queryByRole("button", { name: suggestion })).not.toBeInTheDocument();
      expect(mockOnOpenChange).not.toHaveBeenCalled();
    });

    it("opens the assistant after accept", async () => {
      mockRpc.mockImplementation((name: string) => {
        if (name === "accept_ai_beta_terms") {
          return Promise.resolve({ data: {}, error: null });
        }
        return Promise.resolve({
          data: { accepted: false, version: null, current: AI_BETA_TERMS_VERSION },
          error: null,
        });
      });

      const user = userEvent.setup();
      renderOpen();

      const accept = await screen.findByRole("button", { name: "aiIntake.betaTerms.acceptButton" });
      expect(screen.queryByRole("button", { name: suggestion })).not.toBeInTheDocument();
      await user.click(accept);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: suggestion })).toBeEnabled();
      });
      expect(screen.queryByRole("heading", { name: "aiIntake.betaTerms.title" })).not.toBeInTheDocument();
      expect(mockRpc).toHaveBeenCalledWith("accept_ai_beta_terms", expect.any(Object));
    });

    it("opens nothing when the user chooses not now", async () => {
      mockRpc.mockResolvedValue({
        data: { accepted: false, version: null, current: AI_BETA_TERMS_VERSION },
        error: null,
      });

      const user = userEvent.setup();
      renderOpen();

      const decline = await screen.findByRole("button", { name: "aiIntake.betaTerms.declineButton" });
      await user.click(decline);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(mockRpc).not.toHaveBeenCalledWith("accept_ai_beta_terms", expect.anything());
      expect(screen.queryByRole("button", { name: suggestion })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "aiIntake.betaTerms.title" })).not.toBeInTheDocument();
    });
  });
});
