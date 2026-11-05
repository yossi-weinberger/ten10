// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DraftView } from "../assistant-reply-view";
import { DraftCard } from "./DraftCard";

vi.mock("@/lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("react-i18next", () => ({
  initReactI18next: { type: "3rdParty", init: () => {} },
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "he", dir: () => "rtl" } }),
}));

function view(locked: boolean): DraftView {
  return {
    draft: {
      date: "2026-10-30",
      amount: 180,
      currency: "ILS",
      type: "donation",
      requestedRate: null,
      description: "עזר מציון",
      category: null,
      paymentMethod: null,
    },
    amountInput: "180",
    appliedRuleName: null,
    duplicates: [],
    duplicatesRanked: false,
    locked,
  };
}

function card(locked: boolean) {
  return (
    <DraftCard
      view={view(locked)}
      interactive
      saving={false}
      onDateChange={() => {}}
      onDescriptionChange={() => {}}
      onAmountChange={() => {}}
      onSave={() => {}}
    />
  );
}

describe("DraftCard save celebration", () => {
  afterEach(() => cleanup());

  it("celebrates a donation only when this card sees the save", () => {
    const { container, rerender } = render(card(false));
    expect(container.querySelector("[data-confetti]")).toBeNull();
    rerender(card(true));
    expect(container.querySelector("[data-confetti]")).not.toBeNull();
  });

  it("stays still when it mounts already saved", () => {
    const { container } = render(card(true));
    expect(container.querySelector("[data-confetti]")).toBeNull();
  });
});
