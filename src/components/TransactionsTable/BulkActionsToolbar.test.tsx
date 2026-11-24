// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BulkActionsToolbar } from "./BulkActionsToolbar";

afterEach(() => cleanup());

describe("BulkActionsToolbar", () => {
  it("hides the delete button when onDelete is absent", () => {
    render(
      <BulkActionsToolbar
        selectedCount={3}
        selectedCountLabel="3 selected"
        editLabel="Edit"
        clearLabel="Clear"
        onEdit={vi.fn()}
        onClear={vi.fn()}
        ariaLabel="bulk"
      />,
    );

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });

  it("renders delete when onDelete is provided", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <BulkActionsToolbar
        selectedCount={2}
        selectedCountLabel="2 selected"
        editLabel="Edit"
        deleteLabel="Delete"
        clearLabel="Clear"
        onEdit={vi.fn()}
        onDelete={onDelete}
        onClear={vi.fn()}
        ariaLabel="bulk"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("returns null when nothing is selected", () => {
    const { container } = render(
      <BulkActionsToolbar
        selectedCount={0}
        selectedCountLabel="0 selected"
        editLabel="Edit"
        clearLabel="Clear"
        onEdit={vi.fn()}
        onClear={vi.fn()}
        ariaLabel="bulk"
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [1, "נבחרה שורה אחת"],
    [2, "נבחרו שתי שורות"],
    [5, "נבחרו 5 שורות"],
  ] as const)(
    "announces HE live-region sentence for count %i via sr-only",
    (count, announcement) => {
      render(
        <BulkActionsToolbar
          selectedCount={count}
          selectedCountLabel={String(count)}
          selectedCountAnnouncement={announcement}
          editLabel="עריכה"
          clearLabel="ביטול"
          onEdit={vi.fn()}
          onClear={vi.fn()}
          ariaLabel="פעולות על השורות שנבחרו"
          mobileLayout
        />,
      );

      const region = screen.getByRole("region", {
        name: "פעולות על השורות שנבחרו",
      });
      expect(region).toHaveAttribute("aria-live", "polite");
      const liveText = within(region).getByText(announcement);
      expect(liveText).toHaveClass("sr-only");
      expect(within(region).getByText(String(count))).toHaveAttribute(
        "aria-hidden",
        "true",
      );
      cleanup();
    },
  );
});
