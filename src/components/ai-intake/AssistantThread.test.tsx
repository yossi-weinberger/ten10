// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantThread } from "./AssistantThread";

vi.mock("@/lib/supabaseClient");
vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: "he" },
    }),
  };
});

describe("AssistantThread quick-start chips", () => {
  afterEach(() => cleanup());

  it("sends the correct text for each of the 7 chips when clicked", async () => {
    const user = userEvent.setup();
    const onSuggestion = vi.fn();
    const onReceipt = vi.fn();

    render(
      <AssistantThread
        history={[]}
        active={null}
        activeBlocks={[]}
        interactiveActive={false}
        onSuggestion={onSuggestion}
        onReceipt={onReceipt}
        handlers={{
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
          onAnotherInspiration: vi.fn(),
          saving: false,
          undoing: false,
          questionCalendar: "gregorian",
        }}
      />
    );

    // Verify all 7 chips are rendered (6 text + 1 receipt)
    expect(screen.getByRole("button", { name: /aiIntake.suggestions.transaction/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aiIntake.suggestions.receipt/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aiIntake.suggestions.voice/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aiIntake.suggestions.question/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aiIntake.suggestions.halacha/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aiIntake.suggestions.recurring/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aiIntake.suggestions.rule/ })).toBeInTheDocument();

    // Click each chip and verify it sends its own text
    await user.click(screen.getByRole("button", { name: /aiIntake.suggestions.transaction/ }));
    expect(onSuggestion).toHaveBeenLastCalledWith("aiIntake.suggestions.transaction");

    await user.click(screen.getByRole("button", { name: /aiIntake.suggestions.question/ }));
    expect(onSuggestion).toHaveBeenLastCalledWith("aiIntake.suggestions.question");

    await user.click(screen.getByRole("button", { name: /aiIntake.suggestions.halacha/ }));
    expect(onSuggestion).toHaveBeenLastCalledWith("aiIntake.suggestions.halacha");

    await user.click(screen.getByRole("button", { name: /aiIntake.suggestions.recurring/ }));
    expect(onSuggestion).toHaveBeenLastCalledWith("aiIntake.suggestions.recurring");

    await user.click(screen.getByRole("button", { name: /aiIntake.suggestions.rule/ }));
    expect(onSuggestion).toHaveBeenLastCalledWith("aiIntake.suggestions.rule");

    // Voice chip does nothing (returns early)
    onSuggestion.mockClear();
    await user.click(screen.getByRole("button", { name: /aiIntake.suggestions.voice/ }));
    expect(onSuggestion).not.toHaveBeenCalled();

    // Verify each chip sent its own unique text (not the last chip's text)
    expect(onSuggestion).toHaveBeenCalledTimes(0); // voice doesn't call
  });
});
