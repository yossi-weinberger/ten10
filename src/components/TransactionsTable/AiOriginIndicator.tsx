import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Platform } from "@/contexts/PlatformContext";
import { shouldShowAiOriginIndicator, type AiOrigin } from "./ai-origin";

export function AiOriginIndicator({
  origin,
  platform,
  aiIntakeEnabled,
  className,
}: {
  origin: AiOrigin;
  platform: Platform;
  aiIntakeEnabled: boolean;
  className?: string;
}) {
  const { t } = useTranslation("data-tables");
  if (!shouldShowAiOriginIndicator(platform, origin, aiIntakeEnabled)) return null;

  return (
    <span
      className={className ? `inline-flex ${className}` : "inline-flex"}
      role="img"
      aria-label={t(
        origin === "ai_auto" ? "filters.originAuto" : "filters.originAi",
      )}
    >
      <Sparkles
        className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  );
}
