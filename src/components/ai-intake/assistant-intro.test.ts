// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  assistantCoachStorageKey,
  assistantIntroDismissedKey,
  assistantIntroSessionCountKey,
  assistantIntroStorageKey,
  beginAssistantIntroSession,
  clearAssistantIntroSeen,
  dismissAssistantIntro,
  hasSeenAssistantIntro,
  markAssistantCoachShown,
  markAssistantIntroSeen,
  readIntroPreview,
} from "./assistant-intro";

describe("assistant intro persistence", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("remembers one user without marking another", () => {
    markAssistantIntroSeen(localStorage, "user-a");

    expect(hasSeenAssistantIntro(localStorage, "user-a")).toBe(true);
    expect(hasSeenAssistantIntro(localStorage, "user-b")).toBe(false);
    expect(localStorage.getItem(assistantIntroStorageKey("user-a"))).toBe("1");
  });

  it("clears a stored intro", () => {
    beginAssistantIntroSession(localStorage, sessionStorage, "user-a");
    markAssistantIntroSeen(localStorage, "user-a");
    markAssistantCoachShown(localStorage, "user-a");
    dismissAssistantIntro(localStorage, "user-a");
    clearAssistantIntroSeen(localStorage, "user-a", sessionStorage);

    expect(hasSeenAssistantIntro(localStorage, "user-a")).toBe(false);
    expect(localStorage.getItem(assistantCoachStorageKey("user-a"))).toBeNull();
    expect(localStorage.getItem(assistantIntroDismissedKey("user-a"))).toBeNull();
    expect(localStorage.getItem(assistantIntroSessionCountKey("user-a"))).toBeNull();
  });

  it("plays one ripple in each of three sessions, then stops", () => {
    expect(beginAssistantIntroSession(localStorage, sessionStorage, "user-a")).toBe(true);
    expect(beginAssistantIntroSession(localStorage, sessionStorage, "user-a")).toBe(false);

    sessionStorage.clear();
    expect(beginAssistantIntroSession(localStorage, sessionStorage, "user-a")).toBe(true);
    sessionStorage.clear();
    expect(beginAssistantIntroSession(localStorage, sessionStorage, "user-a")).toBe(true);
    sessionStorage.clear();
    expect(beginAssistantIntroSession(localStorage, sessionStorage, "user-a")).toBe(false);
    expect(localStorage.getItem(assistantIntroSessionCountKey("user-a"))).toBe("3");
  });

  it("stops after the note is dismissed", () => {
    dismissAssistantIntro(localStorage, "user-a");

    expect(beginAssistantIntroSession(localStorage, sessionStorage, "user-a")).toBe(false);
    expect(beginAssistantIntroSession(localStorage, sessionStorage, "user-b")).toBe(true);
  });

  it("ignores preview parameters outside a dev build", () => {
    expect(readIntroPreview("?aiIntro=motion", false)).toBe("off");
    expect(readIntroPreview("?aiIntro=replay", true)).toBe("replay");
    expect(readIntroPreview("?aiIntro=motion", true)).toBe("motion");
    expect(readIntroPreview("?aiIntro=reset", true)).toBe("reset");
    expect(readIntroPreview("?aiIntro=nope", true)).toBe("off");
  });
});
