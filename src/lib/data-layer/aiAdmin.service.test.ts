import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: { access_token: "token" } } }) },
    rpc: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({ logger: { error: () => undefined } }));

import { fetchAdminAiSpend } from "./aiAdmin.service";

const available = { available: true, mixed: false, models: [], appDays: [], sources: { app: 0, eval: 0 } };

describe("fetchAdminAiSpend", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("fetches a range once and serves it from the cache after that", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(available)));

    const first = await fetchAdminAiSpend("2026-10-01", "2026-10-28");
    const second = await fetchAdminAiSpend("2026-10-01", "2026-10-28");

    expect(first?.available).toBe(true);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches a different range again", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(available))));

    await fetchAdminAiSpend("2026-09-01", "2026-09-30");
    await fetchAdminAiSpend("2026-08-01", "2026-08-31");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not cache an unavailable report", async () => {
    const unavailable = { ...available, available: false };
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify(unavailable))));

    await fetchAdminAiSpend("2026-07-01", "2026-07-31");
    await fetchAdminAiSpend("2026-07-01", "2026-07-31");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
