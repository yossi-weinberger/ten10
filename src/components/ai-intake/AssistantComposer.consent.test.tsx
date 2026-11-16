// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AssistantComposer } from "./AssistantComposer";
import { createRef } from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: () => false,
}));

describe("AssistantComposer consent-based disabling", () => {
  const mockOnSubmit = vi.fn();
  const mockOnReceipt = vi.fn();
  const mockOnToggleVoice = vi.fn();
  const mockOnChange = vi.fn();
  const textareaRef = createRef<HTMLTextAreaElement>();

  it("disables all controls when disabled=true", () => {
    render(
      <AssistantComposer
        value="test message"
        onChange={mockOnChange}
        onSubmit={mockOnSubmit}
        onReceipt={mockOnReceipt}
        onToggleVoice={mockOnToggleVoice}
        recording={false}
        transcribing={false}
        mode="message"
        textareaRef={textareaRef}
        disabled={true}
      />
    );

    // Textarea should be disabled
    const textarea = screen.getByRole("textbox", { name: "aiIntake.placeholder" });
    expect(textarea).toBeDisabled();

    // Send button should be disabled
    const sendButton = screen.getByRole("button", { name: "aiIntake.send" });
    expect(sendButton).toBeDisabled();

    // Attach button should be disabled
    const attachButton = screen.getByRole("button", { name: "aiIntake.attach" });
    expect(attachButton).toBeDisabled();

    // Mic button should be disabled
    const micButton = screen.getByRole("button", { name: "aiIntake.voice" });
    expect(micButton).toBeDisabled();
  });

  it("enables all controls when disabled=false", () => {
    const { container } = render(
      <AssistantComposer
        value="test message"
        onChange={mockOnChange}
        onSubmit={mockOnSubmit}
        onReceipt={mockOnReceipt}
        onToggleVoice={mockOnToggleVoice}
        recording={false}
        transcribing={false}
        mode="message"
        textareaRef={textareaRef}
        disabled={false}
      />
    );

    // Textarea should be enabled
    const textarea = container.querySelector('textarea[aria-label="aiIntake.placeholder"]');
    expect(textarea).not.toBeDisabled();

    // Send button should be enabled (with valid text)
    const sendButton = container.querySelector('button[type="submit"][aria-label="aiIntake.send"]');
    expect(sendButton).not.toBeDisabled();

    // Attach button should be enabled
    const attachButton = container.querySelector('button[aria-label="aiIntake.attach"]');
    expect(attachButton).not.toBeDisabled();

    // Mic button should be enabled
    const micButton = container.querySelector('button[aria-label="aiIntake.voice"]');
    expect(micButton).not.toBeDisabled();
  });

  it("disables send button when text is empty even if not disabled", () => {
    const { container } = render(
      <AssistantComposer
        value=""
        onChange={mockOnChange}
        onSubmit={mockOnSubmit}
        onReceipt={mockOnReceipt}
        onToggleVoice={mockOnToggleVoice}
        recording={false}
        transcribing={false}
        mode="message"
        textareaRef={textareaRef}
        disabled={false}
      />
    );

    // Send button should be disabled when text is empty
    const sendButton = container.querySelector('button[aria-label="aiIntake.send"]');
    expect(sendButton).toBeDisabled();
  });
});
