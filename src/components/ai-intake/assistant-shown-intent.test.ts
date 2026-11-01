import { describe, expect, it } from "vitest";
import { shownIntent, namedHalachaPage } from "./assistant-shown-intent";

const today = "2026-10-22";

describe("shownIntent", () => {
  it("shows a page only when Jev named one", () => {
    expect(shownIntent("האם מעשרות משכורת הן מהברוטו או מהנטו?", today, {
      ok: true,
      intent: "out_of_scope",
      confidence: 0.95,
      halachaPage: "tithes",
    })).toBe("domain_adjacent");
    expect(shownIntent("מה זה מעשר?", today, {
      ok: true,
      intent: "out_of_scope",
      confidence: 0.4,
    })).toBe("ask");
  });

  it("does not guess a page from the words when Jev did not name one", () => {
    expect(shownIntent("מה זה מעשר?", today, {
      ok: true,
      intent: "out_of_scope",
      confidence: 0.95,
    })).toBe("out_of_scope");
  });

  it("offers to send a personal ruling to the rabbi", () => {
    expect(shownIntent("האם מותר לי לקזז את זה מהמעשר", today, {
      ok: true,
      intent: "out_of_scope",
      confidence: 0.95,
      halachaPage: "personal",
    })).toBe("ask_rabbi");
  });

  it("keeps a confident data question even when it mentions tithe", () => {
    expect(shownIntent("כמה תרמתי למעשר השנה?", today, {
      ok: true,
      intent: "ask_data",
      confidence: 0.95,
    })).toBe("ask_data");
  });

  it("asks when Jev is not confident, including a capability question", () => {
    expect(shownIntent("אתה יכול?", today, {
      ok: true,
      intent: "help",
      confidence: 0.4,
    })).toBe("ask");
  });

  it("keeps a personal question below the page floor and drops a published page there", () => {
    expect(namedHalachaPage("personal", 0.5)).toBeNull();
    expect(namedHalachaPage("personal", 0.95)).toBe("personal");
    expect(namedHalachaPage("chomesh", 0.66)).toBeNull();
    expect(namedHalachaPage("chomesh", 0.78)).toBe("chomesh");
  });
});
