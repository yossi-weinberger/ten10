// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantThread } from "./AssistantThread";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "aiIntake.suggestions.transaction": "הוצאה חדשה",
        "aiIntake.suggestions.recurring": "תשלום חוזר",
        "aiIntake.suggestions.receipt": "קבלה",
        "aiIntake.suggestions.question": "שאלה",
        "aiIntake.suggestions.balance": "מאזן",
        "aiIntake.suggestions.inspiration": "השראה",
        "aiIntake.suggestions.halacha": "הלכה",
        "aiIntake.greeting.morning": "בוקר טוב",
        "aiIntake.emptyDescription": "איך אוכל לעזור?",
      };
      return translations[key] || key;
    },
    i18n: { language: "he", dir: () => "rtl" },
  }),
}));

const handlers = {
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

describe("AssistantThread", () => {
  afterEach(() => cleanup());

  it("renders transcribing skeleton after user voice bubble", () => {
    const { container } = render(
      <AssistantThread
        history={[
          {
            id: "old-turn",
            user: { kind: "text", text: "כמה תרמתי השנה?" },
            blocks: [{ kind: "dataAnswer", reply: {
              status: "ready",
              year: 2024,
              month: null,
              measure: "sum",
              type: "donation",
              paymentMethod: null,
              recipient: null,
              category: null,
              from: "2024-01-01",
              to: "2024-12-31",
              total: 20496.8,
              count: 5,
              currency: "ILS",
            }}],
          },
        ]}
        active={{ kind: "voice", text: "" }}
        activeBlocks={[{ kind: "thinking", phase: "voice" }]}
        interactiveActive={false}
        onSuggestion={vi.fn()}
        handlers={handlers}
      />
    );

    const turns = container.querySelectorAll('[role="log"] > div');
    expect(turns.length).toBeGreaterThanOrEqual(2);

    const oldTurnMessages = Array.from(turns[0]?.querySelectorAll('[data-slot="message"]') ?? []);
    expect(oldTurnMessages.length).toBe(2);
    expect(oldTurnMessages[0]?.textContent).toContain("כמה תרמתי השנה?");

    const newTurnMessages = Array.from(turns[1]?.querySelectorAll('[data-slot="message"]') ?? []);
    expect(newTurnMessages.length).toBe(2);
    
    const userMessage = newTurnMessages[0];
    const assistantMessage = newTurnMessages[1];
    
    expect(userMessage).toBeDefined();
    expect(userMessage?.getAttribute('data-align')).toBe('end');
    
    expect(assistantMessage).toBeDefined();
    const skeleton = assistantMessage?.querySelector('[role="status"]');
    expect(skeleton).not.toBeNull();
  });

  it("clicking each non-receipt chip sends its own text", async () => {
    const user = userEvent.setup();
    const onSuggestion = vi.fn();
    const { getByText } = render(
      <AssistantThread
        history={[]}
        active={null}
        activeBlocks={[]}
        interactiveActive={false}
        onSuggestion={onSuggestion}
        handlers={handlers}
      />
    );

    // Click each non-receipt chip and verify it sends its own text
    const chips = [
      { label: "הוצאה חדשה", text: "הוצאה חדשה" },
      { label: "תשלום חוזר", text: "תשלום חוזר" },
      { label: "שאלה", text: "שאלה" },
      { label: "מאזן", text: "מאזן" },
      { label: "השראה", text: "השראה" },
      { label: "הלכה", text: "הלכה" },
    ];

    for (const chip of chips) {
      onSuggestion.mockClear();
      const button = getByText(chip.label);
      await user.click(button);
      expect(onSuggestion).toHaveBeenCalledOnce();
      expect(onSuggestion).toHaveBeenCalledWith(chip.text);
    }
  });

  it("clicking the receipt chip does not call onSuggestion", async () => {
    const user = userEvent.setup();
    const onSuggestion = vi.fn();
    const onReceipt = vi.fn();
    const { getByText } = render(
      <AssistantThread
        history={[]}
        active={null}
        activeBlocks={[]}
        interactiveActive={false}
        onSuggestion={onSuggestion}
        onReceipt={onReceipt}
        handlers={handlers}
      />
    );

    const receiptButton = getByText("קבלה");
    await user.click(receiptButton);
    expect(onSuggestion).not.toHaveBeenCalled();
  });
});
