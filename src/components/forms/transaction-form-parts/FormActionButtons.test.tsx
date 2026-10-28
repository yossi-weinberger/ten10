// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHECK_LONG_ARM, CHECK_SHORT_ARM, outlinePath } from "@/components/brand/brandCheck.utils";
import { FormActionButtons } from "./FormActionButtons";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "rtl" },
  }),
}));

afterEach(cleanup);

const submitButton = () =>
  document.querySelector<HTMLButtonElement>('button[type="submit"]')!;

describe("FormActionButtons", () => {
  it("shows no symbol before saving", () => {
    render(<FormActionButtons isSubmitting={false} isSuccess={false} />);
    expect(submitButton().textContent).toContain("transactionForm.actions.submit");
    expect(submitButton().querySelector("svg")).toBeNull();
  });

  it("shows the turning symbol while saving, without dimming the button", () => {
    render(<FormActionButtons isSubmitting isSuccess={false} />);
    const button = submitButton();
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain("transactionForm.actions.submitting");
    expect(button.className).toContain("disabled:opacity-100");
    expect(button.querySelector("svg")).not.toBeNull();
  });

  it("says saved as soon as the save succeeds, and the symbol becomes a one-colour check", () => {
    // The form sets success while react-hook-form still reports submitting.
    render(<FormActionButtons isSubmitting isSuccess />);
    const button = submitButton();
    expect(button.textContent).toContain("transactionForm.messages.success");
    // jsdom has no Element.animate, so the check is drawn at once, as with reduced motion.
    const [ringPath, ...slicePaths] = Array.from(button.querySelectorAll("path"));
    expect(ringPath.getAttribute("d")).toBe(outlinePath(CHECK_LONG_ARM));
    // One colour: the gold slice is hidden and its text-coloured copy is the short arm.
    const gold = slicePaths.find((p) => p.classList.contains("fill-accent"));
    const shortArm = slicePaths.find((p) => p.classList.contains("fill-current"));
    expect(gold?.getAttribute("opacity")).toBe("0");
    expect(shortArm?.getAttribute("opacity")).toBe("1");
    expect(shortArm?.getAttribute("d")).toBe(outlinePath(CHECK_SHORT_ARM));
  });

  it("says saving and saved, not adding and added, when editing", () => {
    const { rerender } = render(<FormActionButtons isSubmitting isSuccess={false} isEditMode />);
    expect(submitButton().textContent).toContain("transactionForm.actions.saving");
    rerender(<FormActionButtons isSubmitting={false} isSuccess isEditMode />);
    expect(submitButton().textContent).toContain("transactionForm.messages.updateSuccess");
  });
});
