import { describe, expect, it } from "vitest";
import { shownIntent } from "./assistant-shown-intent";

const today = "2026-10-22";

describe("shownIntent", () => {
  it("shows the tithe page when the classifier calls a halacha question out of scope", () => {
    const gross = "האם מעשרות משכורת הן מהברוטו או מהנטו?";
    expect(shownIntent(gross, today, { ok: true, intent: "out_of_scope", confidence: 0.95 })).toBe("domain_adjacent");
    expect(shownIntent("מה זה מעשר?", today, { ok: true, intent: "out_of_scope", confidence: 0.4 })).toBe("domain_adjacent");
  });

  it("keeps a personal ruling out of scope", () => {
    expect(shownIntent("האם מותר לי לקזז את זה מהמעשר", today, {
      ok: true,
      intent: "out_of_scope",
      confidence: 0.95,
    })).toBe("out_of_scope");
  });

  it("keeps a confident data question even when it mentions tithe", () => {
    expect(shownIntent("כמה תרמתי למעשר השנה?", today, {
      ok: true,
      intent: "ask_data",
      confidence: 0.95,
    })).toBe("ask_data");
  });
});
