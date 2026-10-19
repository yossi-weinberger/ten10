import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPlatform } from "@/lib/platformManager";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
}));

import {
  DESKTOP_ARRIVAL_CODE_KEY,
  persistDesktopArrivalCode,
  readDesktopArrivalCode,
} from "./desktop";

describe("desktop arrival code", () => {
  beforeEach(() => {
    invoke.mockReset();
    setPlatform("desktop");
  });

  afterEach(() => {
    setPlatform("web");
  });

  it("stores a normalized record in app_settings", async () => {
    invoke.mockResolvedValue(undefined);
    await persistDesktopArrivalCode("  machon  ");
    expect(invoke).toHaveBeenCalledWith("set_app_setting", {
      key: DESKTOP_ARRIVAL_CODE_KEY,
      value: expect.stringContaining("\"arrival_code\":\"MACHON\""),
    });
  });

  it("deletes the setting when the code is cleared", async () => {
    invoke.mockResolvedValue(undefined);
    await persistDesktopArrivalCode("   ");
    expect(invoke).toHaveBeenCalledWith("delete_app_setting", {
      key: DESKTOP_ARRIVAL_CODE_KEY,
    });
  });

  it("is a no-op on web", async () => {
    setPlatform("web");
    await persistDesktopArrivalCode("MACHON");
    expect(invoke).not.toHaveBeenCalled();
  });

  it("reads a stored record", async () => {
    invoke.mockResolvedValueOnce(
      JSON.stringify({
        arrival_code: "MACHON",
        set_at: "2026-10-19T08:00:00.000Z",
      })
    );
    await expect(readDesktopArrivalCode()).resolves.toBe("MACHON");
  });
});
