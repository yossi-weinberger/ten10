import { type Platform } from "@/contexts/PlatformContext";

let currentPlatform: Platform = "loading";

export function setPlatform(platform: Platform) {
  console.log(`PlatformManager: Platform set to -> ${platform}`);
  currentPlatform = platform;
}

export function getPlatform(): Platform {
  return currentPlatform;
}
