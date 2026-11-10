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

  it("should NOT have masking classes on Frame root element", () => {
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

    // The Frame root should NOT have masking classes
    const frameRoot = document.querySelector('[class*="flex"][class*="flex-col"][class*="justify-end"]');
    expect(frameRoot).toBeTruthy();
    expect(frameRoot?.classList.contains("ph-mask")).toBe(false);
    expect(frameRoot?.classList.contains("ph-sensitive")).toBe(false);
    expect(frameRoot?.hasAttribute("data-ph-mask")).toBe(false);
  });

  it("should NOT have masking on header and static elements", () => {
    const mockRef = { current: null };
    
    render(
      <AssistantShell
        open={true}
        onOpenChange={() => {}}
        title="Test Assistant"
        description="Test Description"
        initialFocusRef={mockRef}
        footer={<div>Footer</div>}
      >
        <div data-testid="content">Content</div>
      </AssistantShell>
    );

    // Title should not be masked (no user name in this case)
    const title = document.querySelector('[class*="font-semibold"]');
    expect(title?.textContent).toContain("Test Assistant");
    expect(title?.classList.contains("ph-mask")).toBe(false);
  });

  it("should have ph-no-capture on receipt preview image and mask filename", () => {
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

    // Find the receipt filename (AttachmentTitle)
    const filenameElement = container.querySelector(".ph-mask.ph-sensitive[data-ph-mask]");
    expect(filenameElement).toBeTruthy();
    expect(filenameElement?.textContent).toBe("receipt.jpg");
  });

  it("should have masking on user message bubble", () => {
    const { container } = render(
      <AssistantThread
        history={[
          {
            id: "text-turn",
            user: { kind: "text", text: "Personal message from user" },
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

    // User message bubble should be masked
    const maskedBubble = container.querySelector(".ph-mask.ph-sensitive[data-ph-mask]");
    expect(maskedBubble).toBeTruthy();
    expect(maskedBubble?.textContent).toContain("Personal message from user");
  });

  it("should have masking on draft card with personal data", () => {
    const { container } = render(
      <AssistantThread
        history={[
          {
            id: "draft-turn",
            user: { kind: "text", text: "expense" },
            blocks: [
              {
                kind: "draft",
                view: {
                  draft: {
                    date: "2024-01-15",
                    amount: 100,
                    currency: "ILS",
                    type: "expense",
                    description: "Coffee",
                    category: null,
                    paymentMethod: null,
                    requestedRate: null,
                    isChomesh: false,
                  },
                  amountInput: "100",
                  locked: false,
                  duplicates: [],
                  duplicatesRanked: false,
                  inferred: { amount: false, date: false, description: false },
                  appliedRuleName: null,
                },
              },
            ],
          },
        ]}
        active={null}
        activeBlocks={[]}
        interactiveActive={false}
        onSuggestion={vi.fn()}
        handlers={mockHandlers}
      />
    );

    // Draft card should be masked - find any element with all three classes
    const draftCard = container.querySelector(".ph-mask.ph-sensitive[data-ph-mask]");
    expect(draftCard).toBeTruthy();
    expect(draftCard?.classList.contains("ph-mask")).toBe(true);
    expect(draftCard?.classList.contains("ph-sensitive")).toBe(true);
    expect(draftCard?.hasAttribute("data-ph-mask")).toBe(true);
  });

  it("should NOT have masking on static quick-action chips", () => {
    const { container } = render(
      <AssistantThread
        history={[]}
        active={null}
        activeBlocks={[]}
        interactiveActive={false}
        onSuggestion={vi.fn()}
        handlers={mockHandlers}
      />
    );

    // Static chips should not be masked
    const chips = container.querySelectorAll("button[class*='rounded-full']");
    expect(chips.length).toBeGreaterThan(0);
    
    chips.forEach(chip => {
      expect(chip.classList.contains("ph-mask")).toBe(false);
    });
  });

  it("should have masking on DuplicateScanCard transaction rows", () => {
    const { container } = render(
      <AssistantThread
        history={[
          {
            id: "duplicate-turn",
            user: { kind: "text", text: "יש כפילויות?" },
            blocks: [
              {
                kind: "duplicateScan",
                scan: {
                  status: "ready",
                  count: 1,
                  pairs: [
                    {
                      left: { id: "a", date: "2024-01-15", amount: 100, description: "Coffee", currency: "ILS", type: "expense" },
                      right: { id: "b", date: "2024-01-15", amount: 100, description: "Coffee", currency: "ILS", type: "expense" },
                    },
                  ],
                },
                confirmDeleteId: null,
                actionFailed: false,
              },
            ],
          },
        ]}
        active={null}
        activeBlocks={[]}
        interactiveActive={false}
        onSuggestion={vi.fn()}
        handlers={mockHandlers}
      />
    );

    // Transaction rows should be masked
    const transactionRows = container.querySelectorAll("li.ph-mask.ph-sensitive[data-ph-mask]");
    expect(transactionRows.length).toBeGreaterThan(0);
  });

  // RabbiCard masking is applied at the Card level (verified by code review)
  // Testing it would require AuthProvider mock, but the pattern is consistent with other cards

  it("should have masking on RuleCard parsed rule name", () => {
    const { container } = render(
      <AssistantThread
        history={[
          {
            id: "rule-turn",
            user: { kind: "text", text: "מהיום כל הוצאה על גן היא הוצאה מוכרת" },
            blocks: [
              {
                kind: "rule",
                rule: { name: "גן", action: "recognized-expense" },
                choice: null,
              },
            ],
          },
        ]}
        active={null}
        activeBlocks={[]}
        interactiveActive={false}
        onSuggestion={vi.fn()}
        handlers={mockHandlers}
      />
    );

    // Rule card should be masked
    const ruleCard = container.querySelector(".ph-mask.ph-sensitive[data-ph-mask]");
    expect(ruleCard).toBeTruthy();
    expect(ruleCard?.textContent).toContain("גן");
  });
});
