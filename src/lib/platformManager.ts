import { type Platform } from "@/contexts/PlatformContext";
import { logger } from "@/lib/logger";

// Synchronous initial platform detection (same logic as PlatformContext)
// Web can be detected immediately, desktop needs async verification
const getInitialPlatform = (): Platform => {
  // @ts-expect-error __TAURI_INTERNALS__ is injected by Tauri
  if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
    return "loading"; // Desktop needs async verification
  }
  return "web"; // Web detected synchronously
};

let currentPlatform: Platform = getInitialPlatform();

export function setPlatform(platform: Platform) {
  logger.log(`PlatformManager: Platform set to -> ${platform}`);
  currentPlatform = platform;
}

export function getPlatform(): Platform {
  return currentPlatform;
}
