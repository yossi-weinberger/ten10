import { describe, expect, it } from "vitest";
import { shownIntent, namedHalachaPage } from "./assistant-shown-intent";

describe("shownIntent", () => {
  it("shows a page only when Jev named one", () => {
    expect(shownIntent({
      ok: true,
      intent: "out_of_scope",
      confidence: 0.95,
      halachaPage: "tithes",
    })).toBe("domain_adjacent");
    expect(shownIntent({
      ok: true,
      intent: "out_of_scope",
      confidence: 0.4,
    })).toBe("ask");
  });

  it("does not guess a page from the words when Jev did not name one", () => {
    expect(shownIntent({
      ok: true,
      intent: "out_of_scope",
      confidence: 0.95,
    })).toBe("out_of_scope");
  });

  it("offers to send a personal ruling to the rabbi", () => {
    expect(shownIntent({
      ok: true,
      intent: "out_of_scope",
      confidence: 0.95,
      halachaPage: "personal",
    })).toBe("ask_rabbi");
  });

  it("keeps a confident data question even when it mentions tithe", () => {
    expect(shownIntent({
      ok: true,
      intent: "ask_data",
      confidence: 0.95,
    })).toBe("ask_data");
  });

  it("asks when Jev is not confident, including a capability question", () => {
    expect(shownIntent({
      ok: true,
      intent: "help",
      confidence: 0.4,
    })).toBe("ask");
  });

  it("offers the rabbi for a personal question even when the page confidence is low", () => {
    expect(shownIntent({
      ok: true,
      intent: "out_of_scope",
      confidence: 0.9,
      halachaPage: "personal",
    })).toBe("ask_rabbi");
  });

  it("keeps a movement when a personal page was also named", () => {
    expect(shownIntent({
      ok: true,
      intent: "ask_data",
      confidence: 0.66,
      halachaPage: "personal",
    }, true)).toBe("ask");
  });

  it("names a personal question at any confidence and keeps the floor for a published page", () => {
    expect(namedHalachaPage("personal", 0.3)).toBe("personal");
    expect(namedHalachaPage("personal", 0.5)).toBe("personal");
    expect(namedHalachaPage("chomesh", 0.66)).toBeNull();
    expect(namedHalachaPage("chomesh", 0.78)).toBe("chomesh");
  });
});
