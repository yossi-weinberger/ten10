// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { outlinePath, CHECK_LONG_ARM } from "@/components/brand/brandCheck.utils";
import { FormActionButtons } from "./FormActionButtons";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "rtl" },
  }),
}));

afterEach(cleanup);

const submitButton = () =>
  screen.getByRole("button", { name: /transactionForm\./ }) as HTMLButtonElement;

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

  it("says saved as soon as the save succeeds, and the symbol becomes a check", async () => {
    // The form sets success while react-hook-form still reports submitting.
    render(<FormActionButtons isSubmitting isSuccess />);
    const button = submitButton();
    expect(button.textContent).toContain("transactionForm.messages.success");
    // Without SVG geometry (jsdom) the check shows straight away, without the morph.
    await waitFor(() => {
      const paths = Array.from(button.querySelectorAll("path")).map((p) => p.getAttribute("d"));
      expect(paths).toContain(outlinePath(CHECK_LONG_ARM));
    });
    // One colour: the gold slice is gone, its text-coloured copy is the short arm.
    await waitFor(() => {
      const gold = button.querySelector<SVGPathElement>("path.fill-accent");
      const shortArm = button.querySelectorAll<SVGPathElement>("path.fill-current")[1];
      expect(gold?.style.opacity).toBe("0");
      expect(shortArm?.style.opacity).toBe("1");
    });
  });

  it("says saving and saved, not adding and added, when editing", () => {
    const { rerender } = render(<FormActionButtons isSubmitting isSuccess={false} isEditMode />);
    expect(submitButton().textContent).toContain("transactionForm.actions.saving");
    rerender(<FormActionButtons isSubmitting={false} isSuccess isEditMode />);
    expect(submitButton().textContent).toContain("transactionForm.messages.updateSuccess");
  });
});
