import React from "react";
import { Globe, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/contexts/PlatformContext";

interface PlatformIndicatorProps {
  expanded?: boolean;
}

export function PlatformIndicator({
  expanded = false,
}: PlatformIndicatorProps) {
  const { platform } = usePlatform();

  return (
    <div
      className={cn(
        expanded ? "px-4 self-stretch text-left" : "px-2 flex justify-center"
      )}
    >
      {platform === "loading" && (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      )}
      {platform === "web" && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Globe className="h-6 w-6 flex-shrink-0" />
          {expanded && <span className="text-xs">Web</span>}
        </div>
      )}
      {platform === "desktop" && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Monitor className="h-6 w-6 flex-shrink-0" />
          {expanded && <span className="text-xs">Desktop</span>}
        </div>
      )}
    </div>
  );
}
