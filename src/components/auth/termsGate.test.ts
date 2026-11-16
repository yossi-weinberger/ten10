import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getTermsSurface,
  publishTermsSurface,
  resetTermsSurfaceForTests,
  subscribeTermsSurface,
  whatsNewWaitsForTerms,
} from "./termsGate";

afterEach(() => {
  resetTermsSurfaceForTests();
});

describe("terms surface", () => {
  it("starts checking, so What's New waits", () => {
    expect(getTermsSurface()).toBe("checking");
    expect(whatsNewWaitsForTerms("checking")).toBe(true);
    expect(whatsNewWaitsForTerms("blocking")).toBe(true);
    expect(whatsNewWaitsForTerms("clear")).toBe(false);
  });

  it("notifies subscribers and replays the current surface on subscribe", () => {
    const listener = vi.fn();
    publishTermsSurface("blocking");

    const unsubscribe = subscribeTermsSurface(listener);
    expect(listener).toHaveBeenCalledWith("blocking");

    publishTermsSurface("clear");
    expect(listener).toHaveBeenLastCalledWith("clear");
    expect(getTermsSurface()).toBe("clear");

    unsubscribe();
    publishTermsSurface("blocking");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
