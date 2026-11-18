// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  assistantIntroStorageKey,
  clearAssistantIntroSeen,
  hasSeenAssistantIntro,
  markAssistantIntroSeen,
  readIntroPreview,
} from "./assistant-intro";

describe("assistant intro persistence", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("remembers one user without marking another", () => {
    markAssistantIntroSeen(localStorage, "user-a");

    expect(hasSeenAssistantIntro(localStorage, "user-a")).toBe(true);
    expect(hasSeenAssistantIntro(localStorage, "user-b")).toBe(false);
    expect(localStorage.getItem(assistantIntroStorageKey("user-a"))).toBe("1");
  });

  it("clears a stored intro", () => {
    markAssistantIntroSeen(localStorage, "user-a");
    clearAssistantIntroSeen(localStorage, "user-a");

    expect(hasSeenAssistantIntro(localStorage, "user-a")).toBe(false);
  });

  it("ignores preview parameters outside a dev build", () => {
    expect(readIntroPreview("?aiIntro=motion", false)).toBe("off");
    expect(readIntroPreview("?aiIntro=replay", true)).toBe("replay");
    expect(readIntroPreview("?aiIntro=motion", true)).toBe("motion");
    expect(readIntroPreview("?aiIntro=reset", true)).toBe("reset");
    expect(readIntroPreview("?aiIntro=nope", true)).toBe("off");
  });
});
