import { getPlatform } from "@/lib/platformManager";
import { logger } from "@/lib/logger";
import { normalizeArrivalCode } from "./arrival-code";

export const DESKTOP_ARRIVAL_CODE_KEY = "arrival_code";

export type DesktopArrivalCodeRecord = {
  arrival_code: string;
  set_at: string;
};

function parseDesktopRecord(raw: string | null): DesktopArrivalCodeRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DesktopArrivalCodeRecord>;
    const arrival_code = normalizeArrivalCode(parsed.arrival_code);
    if (!arrival_code) return null;
    return {
      arrival_code,
      set_at:
        typeof parsed.set_at === "string" && parsed.set_at
          ? parsed.set_at
          : new Date().toISOString(),
    };
  } catch {
    const arrival_code = normalizeArrivalCode(raw);
    if (!arrival_code) return null;
    return { arrival_code, set_at: new Date().toISOString() };
  }
}

export async function persistDesktopArrivalCode(code: string): Promise<void> {
  if (getPlatform() !== "desktop") return;

  const normalized = normalizeArrivalCode(code);
  try {
    // Dynamic import keeps Tauri out of the web bundle (same pattern as desktop-settings).
    const { invoke } = await import("@tauri-apps/api/core");
    if (!normalized) {
      await invoke("delete_app_setting", { key: DESKTOP_ARRIVAL_CODE_KEY });
      return;
    }
    const record: DesktopArrivalCodeRecord = {
      arrival_code: normalized,
      set_at: new Date().toISOString(),
    };
    await invoke("set_app_setting", {
      key: DESKTOP_ARRIVAL_CODE_KEY,
      value: JSON.stringify(record),
    });
  } catch (error) {
    logger.error("Failed to persist desktop arrival code:", error);
  }
}

export async function readDesktopArrivalCodeRecord(): Promise<DesktopArrivalCodeRecord | null> {
  if (getPlatform() !== "desktop") return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const raw = await invoke<string | null>("get_app_setting", {
      key: DESKTOP_ARRIVAL_CODE_KEY,
    });
    return parseDesktopRecord(raw);
  } catch (error) {
    logger.error("Failed to read desktop arrival code:", error);
    return null;
  }
}

export async function readDesktopArrivalCode(): Promise<string | null> {
  const record = await readDesktopArrivalCodeRecord();
  return record?.arrival_code ?? null;
}
