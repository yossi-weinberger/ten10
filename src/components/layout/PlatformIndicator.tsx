import React from "react";
import { Globe, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/contexts/PlatformContext";
import { useTranslation } from "react-i18next";

interface PlatformIndicatorProps {
  expanded?: boolean;
}

export function PlatformIndicator({
  expanded = false,
}: PlatformIndicatorProps) {
  const { platform } = usePlatform();
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  return (
    <div
      className={cn(
        "flex items-center transition-all duration-300 px-4 h-10 overflow-hidden text-muted-foreground",
        "justify-start"
      )}
    >
      {platform === "loading" && (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent flex-shrink-0"></div>
      )}
      {platform === "web" && (
        <div className="flex items-center w-full">
          <Globe className="h-6 w-6 flex-shrink-0" />
          <span
            className={cn(
              "text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
              expanded ? "opacity-100 max-w-[100px]" : "opacity-0 max-w-0",
              expanded ? (isRtl ? "mr-4" : "ml-4") : "mx-0"
            )}
          >
            Web
          </span>
        </div>
      )}
      {platform === "desktop" && (
        <div className="flex items-center w-full">
          <Monitor className="h-6 w-6 flex-shrink-0" />
          <span
            className={cn(
              "text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
              expanded ? "opacity-100 max-w-[100px]" : "opacity-0 max-w-0",
              expanded ? (isRtl ? "mr-4" : "ml-4") : "mx-0"
            )}
          >
            Desktop
          </span>
        </div>
      )}
    </div>
  );
}
