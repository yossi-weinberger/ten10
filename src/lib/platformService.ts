import { PlatformContextType } from "@/contexts/PlatformContext";

// פונקציה לקבלת הפלטפורמה (יש להפעיל אותה מהקומפוננטה הראשית)
let currentPlatform: PlatformContextType["platform"] = "loading";
export function setDataServicePlatform(
  platform: PlatformContextType["platform"]
) {
  currentPlatform = platform;
  console.log("PlatformService: Platform set to:", currentPlatform);
}

export function getCurrentPlatform(): PlatformContextType["platform"] {
  return currentPlatform;
}
