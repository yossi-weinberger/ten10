// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { AssistantShell } from "./AssistantShell";
import { AssistantThread } from "./AssistantThread";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      dir: () => "ltr",
      language: "en",
    },
  }),
}));

// Mock react-dropzone
vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({ className: "" }),
    isDragActive: false,
  }),
}));

// Mock the media query hook
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

const mockHandlers = {
  onChooseIntent: vi.fn(),
  onChooseType: vi.fn(),
  onChooseSpecial: vi.fn(),
  onChooseFamily: vi.fn(),
  onSearchDescriptions: vi.fn(),
  onChooseSavedName: vi.fn(),
  onAllInPeriod: vi.fn(),
  onChooseRule: vi.fn(),
  onApproveRule: vi.fn(),
  onOpenReceipt: vi.fn(),
  onDateChange: vi.fn(),
  onDescriptionChange: vi.fn(),
  onAmountChange: vi.fn(),
  onSave: vi.fn(),
  onChomeshChange: vi.fn(),
  onTypeChange: vi.fn(),
  onRecurringChange: vi.fn(),
  onSaveRecurring: vi.fn(),
  onDismissRecurring: vi.fn(),
  onCancelRecurring: vi.fn(),
  onSplitChange: vi.fn(),
  onSaveSplit: vi.fn(),
  onUndoSplit: vi.fn(),
  onUndo: vi.fn(),
  onAskDelete: vi.fn(),
  onConfirmDelete: vi.fn(),
  onCancelDelete: vi.fn(),
  onDismissPair: vi.fn(),
  onRabbiSent: vi.fn(),
  onRabbiDismiss: vi.fn(),
  onAskRabbiFromHalacha: vi.fn(),
  onAnotherInspiration: vi.fn(),
  saving: false,
  undoing: false,
  checkingDuplicates: false,
  questionCalendar: "hebrew" as const,
};

describe("AssistantShell privacy masking", () => {
  afterEach(() => cleanup());

  it("should have ph-mask, ph-sensitive, and data-ph-mask on root element", () => {
    const mockRef = { current: null };
    
    render(
      <AssistantShell
        open={true}
        onOpenChange={() => {}}
        title="Test Title"
        description="Test Description"
        initialFocusRef={mockRef}
        footer={<div>Footer</div>}
      >
        <div data-testid="content">Content</div>
      </AssistantShell>
    );

    // The root element is inside SheetContent (desktop mode by default in mock)
    // Find the element with our masking classes
    const maskedElement = document.querySelector(".ph-mask.ph-sensitive[data-ph-mask]");
    
    expect(maskedElement).toBeTruthy();
    expect(maskedElement?.classList.contains("ph-mask")).toBe(true);
    expect(maskedElement?.classList.contains("ph-sensitive")).toBe(true);
    expect(maskedElement?.hasAttribute("data-ph-mask")).toBe(true);
  });

  it("should have ph-no-capture on receipt preview image", () => {
    const { container } = render(
      <AssistantThread
        history={[
          {
            id: "receipt-turn",
            user: { kind: "receipt", fileName: "receipt.jpg", mimeType: "image/jpeg", previewUrl: "data:image/jpeg;base64,test" },
            blocks: [],
          },
        ]}
        active={null}
        activeBlocks={[]}
        interactiveActive={false}
        onSuggestion={vi.fn()}
        handlers={mockHandlers}
      />
    );

    // Find the receipt preview image
    const receiptImg = container.querySelector('img[alt="receipt.jpg"]');
    
    expect(receiptImg).toBeTruthy();
    expect(receiptImg?.classList.contains("ph-no-capture")).toBe(true);
  });
});
