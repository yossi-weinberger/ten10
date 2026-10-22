import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const getPlatform = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => invoke(...args),
    },
  },
}));

vi.mock("@/lib/platformManager", () => ({
  getPlatform: () => getPlatform(),
}));

import { openAiReceipt } from "./open-receipt";

const project = "https://bbcllewcotypedqsnwmi.supabase.co";
const signed = `${project}/storage/v1/object/sign/intake-artifacts/user/file?token=abc`;

function fakeWindow(): { opener: Window | null; location: { href: string }; close: ReturnType<typeof vi.fn> } {
  return { opener: {} as Window, location: { href: "" }, close: vi.fn() };
}

beforeEach(() => {
  invoke.mockReset();
  getPlatform.mockReset();
  getPlatform.mockReturnValue("web");
  vi.stubEnv("VITE_SUPABASE_URL", project);
});

describe("openAiReceipt", () => {
  it("opens a blank window during the click and navigates after the url arrives", async () => {
    const popup = fakeWindow();
    vi.stubGlobal("window", { open: vi.fn(() => popup) });
    invoke.mockResolvedValue({ data: { url: signed }, error: null });
    await expect(openAiReceipt({ transactionId: "tx" })).resolves.toEqual({ status: "opened" });
    expect(popup.opener).toBeNull();
    expect(popup.location.href).toBe(signed);
    expect(popup.close).not.toHaveBeenCalled();
  });

  it("returns blocked when the browser refuses the blank window", async () => {
    vi.stubGlobal("window", { open: vi.fn(() => null) });
    invoke.mockResolvedValue({ data: { url: signed }, error: null });
    await expect(openAiReceipt({ artifactId: "art" })).resolves.toEqual({
      status: "blocked",
      url: signed,
    });
  });

  it("closes the blank window when there is no receipt", async () => {
    const popup = fakeWindow();
    vi.stubGlobal("window", { open: vi.fn(() => popup) });
    invoke.mockResolvedValue({ data: { reason: "none" }, error: null });
    await expect(openAiReceipt({ transactionId: "tx" })).resolves.toEqual({ status: "none" });
    expect(popup.close).toHaveBeenCalled();
    expect(popup.location.href).toBe("");
  });
});
