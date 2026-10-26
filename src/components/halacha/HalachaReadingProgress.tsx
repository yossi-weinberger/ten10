import { useTranslation } from "react-i18next";
import { BrandProgress } from "@/components/brand/BrandProgress";
import { cn } from "@/lib/utils";

interface HalachaReadingProgressProps {
  /** Reading progress, 0–100. */
  value: number;
  /** Symbol and percentage only, for the mobile tab bar. */
  compact?: boolean;
  className?: string;
}

/**
 * How much of the halacha content has been read (motion lab #15): the Ten10 ring fills
 * as the reader scrolls, and the slice drops in at the end.
 */
export const HalachaReadingProgress = ({
  value,
  compact = false,
  className,
}: HalachaReadingProgressProps) => {
  const { t } = useTranslation("halacha-common");

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={t("readingProgress")}
      className={cn("flex items-center gap-2 print:hidden", className)}
    >
      <BrandProgress value={value} className={compact ? "h-5 w-5" : "h-7 w-7"} />
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
