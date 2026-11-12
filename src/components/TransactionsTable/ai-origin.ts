import type { Platform } from "@/contexts/PlatformContext";
import { isAiIntakeEnabled } from "@/lib/ai/flags";
import type { TransactionForTable } from "@/types/transaction";

export type AiOrigin = TransactionForTable["origin"];

export function shouldShowAiOriginIndicator(
  platform: Platform,
  origin: AiOrigin,
): boolean {
  return (
    platform === "web" &&
    isAiIntakeEnabled() &&
    (origin === "ai" || origin === "ai_auto")
  );
}
