// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AssistantDrawer, type AssistantDrawerHandle } from "./AssistantDrawer";
import { supabase } from "@/lib/supabaseClient";
import { AI_BETA_TERMS_VERSION } from "@/lib/ai/beta-terms-version";
import { createRef } from "react";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock("@/lib/ai/flags", () => ({
  isAiIntakeEnabled: () => true,
}));

vi.mock("@/lib/ai/assistant-extras", () => ({
  loadTitheBalance: vi.fn().mockResolvedValue({ total: 100 }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-id" } }),
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
    user: { id: "test-user-id" },
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
    handleSubmit: vi.fn(),
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
    handleReceipt: vi.fn(),
    toggleRecording: vi.fn(),
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
    vi.clearAllMocks();
  });

  it("shows beta terms dialog when user has not accepted current version", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        accepted: false,
        version: null,
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });
    (supabase.rpc as unknown) = mockRpc;

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
      expect(screen.getByText(/Beta Terms Consent/i)).toBeInTheDocument();
    });
  });

  it("shows beta terms dialog when user accepted old version", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        accepted: true,
        version: "beta-v0",
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });
    (supabase.rpc as unknown) = mockRpc;

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
      expect(screen.getByText("betaTerms.title")).toBeInTheDocument();
    });
  });

  it("does not show beta terms dialog when user accepted current version", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        accepted: true,
        version: AI_BETA_TERMS_VERSION,
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });
    (supabase.rpc as unknown) = mockRpc;

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
      expect(screen.queryByText("betaTerms.title")).not.toBeInTheDocument();
    });
  });

  it("shows beta terms dialog when user opted out (accepted=false)", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        accepted: false,
        version: AI_BETA_TERMS_VERSION,
        current: AI_BETA_TERMS_VERSION,
      },
      error: null,
    });
    (supabase.rpc as unknown) = mockRpc;

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
      expect(screen.getByText("betaTerms.title")).toBeInTheDocument();
    });
  });

  it("shows beta terms dialog on RPC error (fail closed)", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: null,
      error: new Error("Network error"),
    });
    (supabase.rpc as unknown) = mockRpc;

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
      expect(screen.getByText("betaTerms.title")).toBeInTheDocument();
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
});
