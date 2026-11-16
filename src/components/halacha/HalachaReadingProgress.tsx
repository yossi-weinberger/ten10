import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import { BrandProgress } from "@/components/brand/BrandProgress";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { cn } from "@/lib/utils";

interface HalachaReadingProgressProps {
  /** The halacha content block; it may scroll itself or sit in a scrolling area. */
  contentRef: RefObject<HTMLElement | null>;
  /** Symbol and percentage only, for the mobile tab bar. */
  compact?: boolean;
  className?: string;
}

/**
 * How much of the halacha content has been read (motion lab #15): the Ten10 ring fills
 * as the reader scrolls, and the slice drops in at the end.
 *
 * It tracks the scroll itself, so only this indicator re-renders while the reader
 * scrolls, not the page with all the content.
 */
export const HalachaReadingProgress = ({
  contentRef,
  compact = false,
  className,
}: HalachaReadingProgressProps) => {
  const { t } = useTranslation("halacha-common");
  const value = useReadingProgress(contentRef);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={t("readingProgress")}
      className={cn("flex items-center gap-2 print:hidden", className)}
    >
      <BrandProgress
        value={value}
        smooth={false}
        className={compact ? "h-5 w-5" : "h-7 w-7"}
      />
      {!compact && (
        <span className="text-sm text-muted-foreground">{t("readingProgress")}</span>
      )}
      <span
        className={cn("text-sm font-semibold tabular-nums text-foreground", !compact && "ms-auto")}
        dir="ltr"
      >
        {value}%
      </span>
    </div>
  );
};
