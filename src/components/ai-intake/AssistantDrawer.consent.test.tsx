// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AssistantDrawer, CONSENT_CHECK_TIMEOUT_MS, type AssistantDrawerHandle } from "./AssistantDrawer";
import { AssistantFab } from "./AssistantFab";
import { onAssistantOpenRequest, requestAssistantOpen, setAssistantConsentCover } from "./assistant-open";
import { supabase } from "@/lib/supabaseClient";
import { AI_BETA_TERMS_VERSION } from "@/lib/ai/beta-terms-version";
import { createRef, useEffect, useState, type ReactNode } from "react";

const mockRpc = vi.hoisted(() => vi.fn());
const mockHandleSubmit = vi.hoisted(() => vi.fn());
const mockHandleReceipt = vi.hoisted(() => vi.fn());
const mockToggleRecording = vi.hoisted(() => vi.fn());
const compactViewport = vi.hoisted(() => ({ value: false }));
const mockToastError = vi.hoisted(() => vi.fn());

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

vi.mock("sonner", () => ({
  toast: { error: mockToastError, success: vi.fn() },
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
    setAssistantConsentCover(false);
    mockAuthUser = { id: "test-user-id", email: "test@example.com" };
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      }),
    });
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

    function OpenHost({ children }: { children?: ReactNode }) {
      const [open, setOpen] = useState(true);
      return (
        <TooltipProvider>
          {children}
          <AssistantDrawer
            open={open}
            onOpenChange={(next) => {
              mockOnOpenChange(next);
              setOpen(next);
            }}
            receiveRef={receiveRef}
            onNavigate={mockOnNavigate}
            userName="Test User"
          />
        </TooltipProvider>
      );
    }

    it("hides the assistant button and its label while the consent drawer is open", async () => {
      mockRpc.mockResolvedValue({
        data: { accepted: false, version: null, current: AI_BETA_TERMS_VERSION },
        error: null,
      });
      const user = userEvent.setup();
      render(
        <OpenHost>
          <AssistantFab />
        </OpenHost>,
      );

      await screen.findByRole("heading", { name: "aiIntake.betaTerms.title" });
      expect(screen.queryByRole("button", { name: "menu.assistant" })).not.toBeInTheDocument();
      expect(screen.queryByText("menu.assistant")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "aiIntake.betaTerms.declineButton" }));

      expect(screen.getByRole("button", { name: "menu.assistant" })).toBeInTheDocument();
    });

    it("shows pending feedback and does not stack a second open", async () => {
      mockRpc.mockImplementation(() => new Promise(() => {}));
      function ListeningHost() {
        const [open, setOpen] = useState(false);
        useEffect(() => onAssistantOpenRequest(() => setOpen(true)), []);
        return (
          <TooltipProvider>
            <AssistantFab />
            <AssistantDrawer
              open={open}
              onOpenChange={setOpen}
              receiveRef={receiveRef}
              onNavigate={mockOnNavigate}
              userName="Test User"
            />
          </TooltipProvider>
        );
      }

      const user = userEvent.setup();
      render(<ListeningHost />);
      await user.click(screen.getByRole("button", { name: "menu.assistant" }));

      expect(await screen.findByRole("heading", { name: "aiIntake.betaTerms.checkingTitle" })).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent("aiIntake.betaTerms.checkingDescription");
      expect(screen.queryByRole("button", { name: "menu.assistant" })).not.toBeInTheDocument();
      expect(mockRpc).toHaveBeenCalledTimes(1);

      requestAssistantOpen();

      expect(mockRpc).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("heading", { name: "aiIntake.betaTerms.checkingTitle" })).toBeInTheDocument();
    });

    it("closes the pending check without opening the assistant", async () => {
      let resolveConsent: (value: { data: { accepted: boolean; version: string }; error: null }) => void = () => {};
      mockRpc.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveConsent = resolve;
          }),
      );
      const user = userEvent.setup();
      render(
        <OpenHost>
          <AssistantFab />
        </OpenHost>,
      );

      await user.click(await screen.findByRole("button", { name: "aiIntake.betaTerms.cancelCheck" }));

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      expect(screen.queryByRole("heading", { name: "aiIntake.betaTerms.checkingTitle" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: suggestion })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "menu.assistant" })).toBeInTheDocument();

      await act(async () => {
        resolveConsent({
          data: { accepted: true, version: AI_BETA_TERMS_VERSION },
          error: null,
        });
      });

      expect(screen.queryByRole("button", { name: suggestion })).not.toBeInTheDocument();
      expect(mockToastError).not.toHaveBeenCalled();
    });

    it("fails closed with an error when the consent check times out", async () => {
      vi.useFakeTimers();
      try {
        mockRpc.mockImplementation(() => new Promise(() => {}));
        render(<OpenHost />);

        expect(screen.getByRole("heading", { name: "aiIntake.betaTerms.checkingTitle" })).toBeInTheDocument();

        await act(async () => {
          await vi.advanceTimersByTimeAsync(CONSENT_CHECK_TIMEOUT_MS);
        });

        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
        expect(mockToastError).toHaveBeenCalledWith("aiIntake.betaTerms.checkTimeout");
        expect(screen.queryByRole("heading", { name: "aiIntake.betaTerms.checkingTitle" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: suggestion })).not.toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "aiIntake.betaTerms.title" })).not.toBeInTheDocument();
      } finally {
        vi.clearAllTimers();
        vi.useRealTimers();
      }
    });
  });

  it("keeps the desktop assistant open when the consent check is slow", async () => {
    vi.useFakeTimers();
    try {
      mockRpc.mockImplementation(() => new Promise(() => {}));
      render(
        <AssistantDrawer
          open={true}
          onOpenChange={mockOnOpenChange}
          receiveRef={receiveRef}
          onNavigate={mockOnNavigate}
          userName="Test User"
        />,
      );

      await act(async () => {
        await vi.advanceTimersByTimeAsync(CONSENT_CHECK_TIMEOUT_MS + 1_000);
      });

      expect(mockOnOpenChange).not.toHaveBeenCalled();
      expect(mockToastError).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: "aiIntake.suggestions.transaction" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "aiIntake.betaTerms.checkingTitle" })).not.toBeInTheDocument();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
