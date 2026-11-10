/**
 * @vitest-environment jsdom
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nextProvider } from "react-i18next";
import { AssistantComposer } from "./AssistantComposer";
import i18n from "../../lib/i18n";

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  (window as typeof globalThis).ResizeObserver = class ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
});

afterEach(() => {
  cleanup();
});

describe("AssistantComposer cancel recording", () => {
  it("does not show cancel button when not recording", () => {
    const onCancelRecording = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <AssistantComposer
          value=""
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          onReceipt={vi.fn()}
          onToggleVoice={vi.fn()}
          onCancelRecording={onCancelRecording}
          recording={false}
          transcribing={false}
          mode="message"
          textareaRef={{ current: null }}
        />
      </I18nextProvider>,
    );

    const buttons = screen.getAllByRole("button");
    const cancelButton = buttons.find((btn) => {
      const label = btn.getAttribute("aria-label");
      return label === "Cancel recording" || label === "בטל הקלטה";
    });
    expect(cancelButton).toBeUndefined();
  });

  it("shows cancel button when recording", () => {
    const onCancelRecording = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <AssistantComposer
          value=""
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          onReceipt={vi.fn()}
          onToggleVoice={vi.fn()}
          onCancelRecording={onCancelRecording}
          recording={true}
          transcribing={false}
          elapsed={10}
          mode="message"
          textareaRef={{ current: null }}
        />
      </I18nextProvider>,
    );

    const buttons = screen.getAllByRole("button");
    const cancelButton = buttons.find((btn) => {
      const label = btn.getAttribute("aria-label");
      return label === "Cancel recording" || label === "בטל הקלטה";
    });
    expect(cancelButton).toBeDefined();
  });

  it("calls onCancelRecording when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancelRecording = vi.fn();
    render(
      <I18nextProvider i18n={i18n}>
        <AssistantComposer
          value=""
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          onReceipt={vi.fn()}
          onToggleVoice={vi.fn()}
          onCancelRecording={onCancelRecording}
          recording={true}
          transcribing={false}
          elapsed={10}
          mode="message"
          textareaRef={{ current: null }}
        />
      </I18nextProvider>,
    );

    const buttons = screen.getAllByRole("button");
    const cancelButton = buttons.find((btn) => {
      const label = btn.getAttribute("aria-label");
      return label === "Cancel recording" || label === "בטל הקלטה";
    });
    expect(cancelButton).toBeDefined();
    if (cancelButton) {
      await user.click(cancelButton);
      expect(onCancelRecording).toHaveBeenCalledOnce();
    }
  });

  it("does not show cancel button when onCancelRecording is not provided", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <AssistantComposer
          value=""
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          onReceipt={vi.fn()}
          onToggleVoice={vi.fn()}
          recording={true}
          transcribing={false}
          elapsed={10}
          mode="message"
          textareaRef={{ current: null }}
        />
      </I18nextProvider>,
    );

    const buttons = screen.getAllByRole("button");
    const cancelButton = buttons.find((btn) => {
      const label = btn.getAttribute("aria-label");
      return label === "Cancel recording" || label === "בטל הקלטה";
    });
    expect(cancelButton).toBeUndefined();
  });
});
