import type { ReactNode } from "react";
import { PH_SENSITIVE_PROPS } from "@/lib/analytics/posthog-masking";
import { cn } from "@/lib/utils/formatting";

export function StickyGroupHeader({
  label,
  placeChip = false,
  chip,
}: {
  label: string;
  placeChip?: boolean;
  chip?: ReactNode;
}) {
  return (
    <div
      data-sort-chip-slot={placeChip ? "separator" : undefined}
      className={cn(
        "sticky top-[var(--mobile-topbar-h,0px)] z-10 bg-background py-2 text-xs font-medium text-muted-foreground",
      )}
    >
      <span
        className={cn(
          PH_SENSITIVE_PROPS.className,
          placeChip && "me-48 block max-w-[calc(100%-12rem)] truncate",
        )}
        data-ph-mask={PH_SENSITIVE_PROPS["data-ph-mask"]}
      >
        {label}
      </span>
      {placeChip ? (
        <div className="absolute end-0 top-1/2 z-10 -translate-y-1/2">
          {chip}
        </div>
      ) : null}
    </div>
  );
}
