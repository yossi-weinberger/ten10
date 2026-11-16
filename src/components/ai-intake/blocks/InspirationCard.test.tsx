// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { InspirationView } from "@/lib/ai/inspiration-pick";
import { ReplyBlockView, type ReplyHandlers } from "../ReplyBlockView";
import { InspirationCard } from "./InspirationCard";

/** jsdom has no layout: a body this long "overflows" its six folded lines. */
const FOLD_AT = 320;
const scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight");
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return (this.textContent ?? "").length > FOLD_AT ? 200 : 0;
    },
  });
});
afterAll(() => {
  if (scrollHeight) Object.defineProperty(HTMLElement.prototype, "scrollHeight", scrollHeight);
});

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: () => null,
}));

const handlers = {
  onAnotherInspiration: () => {},
  saving: false,
  undoing: false,
  questionCalendar: "gregorian",
} as ReplyHandlers;

function inspiration(item: InspirationView) {
  return (
    <ReplyBlockView
      block={{ kind: "inspiration", item }}
      interactive
      handlers={handlers}
    />
  );
}

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
        item={{ id: "b", title: "Long", body: "x".repeat(FOLD_AT + 1), source: "  " }}
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

  it("collapses the next long item after read more", () => {
    const long = "x".repeat(FOLD_AT + 1);
    const { rerender } = render(inspiration({ id: "a", title: "First", body: long, source: "" }));
    fireEvent.click(screen.getByRole("button", { name: "aiIntake.inspiration.more" }));
    expect(screen.getByRole("button", { name: "aiIntake.inspiration.less" })).toBeInTheDocument();

    rerender(inspiration({ id: "b", title: "Second", body: long, source: "" }));
    expect(screen.getByRole("button", { name: "aiIntake.inspiration.more" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "aiIntake.inspiration.less" })).not.toBeInTheDocument();
  });
});
