// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { INSPIRATION_FOLD_AT } from "@/lib/ai/inspiration-pick";
import { InspirationCard } from "./InspirationCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("InspirationCard", () => {
  afterEach(() => cleanup());

  it("shows the title, the text, and the source, and hides an empty source", () => {
    const { rerender } = render(
      <InspirationCard
        item={{ id: "a", title: "Title", body: "Body", source: "Malachi 3:10" }}
        onAnother={() => {}}
      />,
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Malachi 3:10")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "aiIntake.inspiration.more" })).not.toBeInTheDocument();

    rerender(
      <InspirationCard
        item={{ id: "b", title: "Long", body: "x".repeat(INSPIRATION_FOLD_AT + 1), source: "  " }}
        onAnother={() => {}}
      />,
    );
    expect(screen.queryByText("Malachi 3:10")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "aiIntake.inspiration.more" })).toBeInTheDocument();
  });

  it("asks for another item without choosing an intent again", () => {
    const onAnother = vi.fn();
    render(
      <InspirationCard
        item={{ id: "a", title: "Title", body: "Body", source: "" }}
        onAnother={onAnother}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "aiIntake.inspiration.another" }));
    expect(onAnother).toHaveBeenCalledOnce();
  });
});
