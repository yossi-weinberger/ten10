import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setPlatform } from "@/lib/platformManager";
import { useDonationStore } from "@/lib/store";
import {
  persistAllDesktopSettings,
  restoreDesktopSettings,
} from "./desktop-settings.service";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke,
}));

describe("desktop calendar preference persistence", () => {
  beforeEach(() => {
    invoke.mockReset();
    setPlatform("desktop");
  });

  afterEach(() => {
    setPlatform("web");
  });

  it("persists both calendar preferences in client_preferences", async () => {
    const settings = {
      ...useDonationStore.getState().settings,
      calendarType: "hebrew" as const,
      showSecondaryDate: true,
    };

    await persistAllDesktopSettings(settings);

    expect(invoke).toHaveBeenCalledWith("set_app_setting", {
      key: "client_preferences",
      value: JSON.stringify(settings),
    });
  });

  it("restores both calendar preferences from client_preferences", async () => {
    invoke.mockResolvedValueOnce(
      JSON.stringify({
        calendarType: "hebrew",
        showSecondaryDate: true,
      }),
    );

    await restoreDesktopSettings();

    expect(useDonationStore.getState().settings).toMatchObject({
      calendarType: "hebrew",
      showSecondaryDate: true,
    });
  });
});
