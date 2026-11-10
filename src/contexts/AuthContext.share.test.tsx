// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type Listener = (event: string, session: { user: { id: string } } | null) => Promise<void> | void;
const auth = vi.hoisted(() => ({ listener: null as Listener | null }));
const clearSharedIntake = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const clearAiAccessCache = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: Listener) => {
        auth.listener = callback;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signOut: () => Promise.resolve({ error: null }),
    },
  },
  getCachedSession: () => Promise.resolve({ data: { session: null } }),
  invalidateSessionCache: () => {},
}));
vi.mock("@/lib/ai/share-target", () => ({ clearSharedIntake }));
vi.mock("@/lib/ai/ai-access-cache", () => ({ clearAiAccessCache }));
vi.mock("@/lib/store", () => ({ useDonationStore: () => false }));
vi.mock("@/lib/i18n", () => ({ default: { language: "he", t: (key: string) => key } }));
vi.mock("@/lib/logger", () => ({ logger: { log: () => {}, error: () => {}, warn: () => {} } }));
vi.mock("./PlatformContext", () => ({ usePlatform: () => ({ platform: "web" }) }));
vi.mock("@/lib/services/currency-sync.service", () => ({ CurrencySyncService: {} }));
vi.mock("@/lib/services/preferences-sync.service", () => ({ PreferencesSyncService: {} }));
vi.mock("@/lib/analytics/posthogClient", () => ({ resetPostHogUser: () => {} }));
vi.mock("@/lib/analytics/posthogIdentity.service", () => ({ syncPostHogUserIdentity: () => Promise.resolve() }));
vi.mock("@/lib/analytics/productAnalytics", () => ({ trackProductEvent: () => {} }));
vi.mock("@/lib/calendar/calendar-preview", () => ({ useCalendarPreview: { getState: () => ({ clearPreview: () => {} }) } }));

import { AuthProvider } from "./AuthContext";

async function emit(event: string, userId: string | null) {
  await act(async () => {
    await auth.listener?.(event, userId ? { user: { id: userId } } : null);
  });
}

describe("AuthProvider and pending shares", () => {
  afterEach(() => {
    clearSharedIntake.mockClear();
    clearAiAccessCache.mockClear();
  });

  it("drops a pending share when the user signs out", async () => {
    render(<AuthProvider>{null}</AuthProvider>);
    await emit("SIGNED_IN", "a");
    expect(clearSharedIntake).not.toHaveBeenCalled();
    await emit("SIGNED_OUT", null);
    expect(clearSharedIntake).toHaveBeenCalledTimes(1);
    expect(clearAiAccessCache).toHaveBeenCalledTimes(1);
  });

  it("drops a pending share when another account takes over without a sign-out", async () => {
    render(<AuthProvider>{null}</AuthProvider>);
    await emit("SIGNED_IN", "a");
    await emit("SIGNED_IN", "a");
    expect(clearSharedIntake).not.toHaveBeenCalled();
    expect(clearAiAccessCache).not.toHaveBeenCalled();
    await emit("SIGNED_IN", "b");
    expect(clearSharedIntake).toHaveBeenCalledTimes(1);
    expect(clearAiAccessCache).toHaveBeenCalledTimes(1);
  });
});
