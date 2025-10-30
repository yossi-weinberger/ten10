import { type Platform } from "@/contexts/PlatformContext";
import { logger } from "@/lib/logger";

let currentPlatform: Platform = "loading";

export function setPlatform(platform: Platform) {
  logger.log(`PlatformManager: Platform set to -> ${platform}`);
  currentPlatform = platform;
}

export function getPlatform(): Platform {
  return currentPlatform;
}
