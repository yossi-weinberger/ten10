import type { Platform } from "@/contexts/PlatformContext";
import type { TransactionForTable } from "@/types/transaction";

export type AiOrigin = TransactionForTable["origin"];

/** `aiIntakeEnabled` is the reactive `useAiIntakeUi` result, not a one-time flag read. */
export function shouldShowAiOriginIndicator(
  platform: Platform,
  origin: AiOrigin,
  aiIntakeEnabled: boolean,
): boolean {
  return (
    platform === "web" &&
    aiIntakeEnabled &&
    (origin === "ai" || origin === "ai_auto")
  );
}
