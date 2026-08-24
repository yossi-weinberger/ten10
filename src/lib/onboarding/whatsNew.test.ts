import { beforeEach, describe, expect, it, vi } from "vitest";
import { CURRENT_WHATS_NEW_VERSION } from "@/lib/whats-new-history";

const updateSettings = vi.fn();
const mockUpdateEq = vi.fn();

vi.mock("@/lib/store", () => ({
  useDonationStore: {
    getState: () => ({
      updateSettings,
    }),
  },
}));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: () => ({
      update: () => ({
        eq: (...args: unknown[]) => mockUpdateEq(...args),
      }),
    }),
  },
}));

import {
  isWhatsNewSuppressedForSession,
  markCurrentWhatsNewSeen,
  suppressWhatsNewForSession,
} from "./whatsNew";

function createSessionStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

beforeEach(() => {
  updateSettings.mockReset();
  mockUpdateEq.mockReset();
  mockUpdateEq.mockResolvedValue({ error: null });
  vi.stubGlobal("sessionStorage", createSessionStorage());
});

describe("whatsNew first-run helpers", () => {
  it("suppresses What's New for the current session", () => {
    expect(isWhatsNewSuppressedForSession()).toBe(false);
    suppressWhatsNewForSession();
    expect(isWhatsNewSuppressedForSession()).toBe(true);
  });

  it("writes the dedicated last_seen_version column on Web", async () => {
    await markCurrentWhatsNewSeen({ platform: "web", userId: "user-1" });

    expect(updateSettings).toHaveBeenCalledWith({
      lastSeenVersion: CURRENT_WHATS_NEW_VERSION,
    });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(isWhatsNewSuppressedForSession()).toBe(true);
  });

  it("does not touch Supabase on Desktop", async () => {
    await markCurrentWhatsNewSeen({ platform: "desktop", userId: null });
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });
});
