import { Scale } from "lucide-react";
import { useTranslation } from "react-i18next";
import { StatCard } from "@/components/dashboard/StatCards/StatCard";
import { useDonationStore } from "@/lib/store";
import { normalizeCurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";

/**
 * Read-only tithe StatCard for the opening-balance modal (matches home styling).
 * No goal progress bar — only total + optional maaser/chomesh chips.
 */
export function OpeningBalanceHomeStyleStatCard() {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = normalizeCurrencyCode(
    useDonationStore((s) => s.settings.defaultCurrency)
  );
  const trackChomeshSeparately = useDonationStore(
    (s) => s.settings.trackChomeshSeparately,
  );
  const serverTitheBalance = useDonationStore(
    (s) => s.serverCalculatedTitheBalance,
  );
  const serverMaaserBalance = useDonationStore(
    (s) => s.serverCalculatedMaaserBalance,
  );
  const serverChomeshBalance = useDonationStore(
    (s) => s.serverCalculatedChomeshBalance,
  );

  const showChomeshBreakdown =
    trackChomeshSeparately &&
    typeof serverChomeshBalance === "number" &&
    serverChomeshBalance !== 0;

  const maaserVal = serverMaaserBalance ?? 0;
  const chomeshVal = serverChomeshBalance ?? 0;

  const subtitleContent = showChomeshBreakdown ? (
    <div
      className="-mt-2 sm:-mt-3 flex flex-wrap justify-center items-start gap-x-2 gap-y-1 py-[15px]"
      dir={i18n.dir()}
    >
      <span
        className={`whitespace-nowrap inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${
          maaserVal > 0
            ? "bg-destructive/10 dark:bg-white/5 text-foreground/70 dark:text-rose-300 border-destructive/25 dark:border-rose-400/40"
            : "bg-success/10 dark:bg-white/5 text-foreground/70 dark:text-emerald-400 border-success/25 dark:border-emerald-500/40"
        }`}
      >
        {t("statsCards.overallRequired.maaser")}:{" "}
        {formatCurrency(maaserVal, defaultCurrency, i18n.language)}
      </span>
      <span
        className={`whitespace-nowrap inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${
          chomeshVal > 0
            ? "bg-destructive/10 dark:bg-white/5 text-foreground/70 dark:text-rose-300 border-destructive/25 dark:border-rose-400/40"
            : "bg-success/10 dark:bg-white/5 text-foreground/70 dark:text-emerald-400 border-success/25 dark:border-emerald-500/40"
        }`}
      >
        {t("statsCards.overallRequired.chomesh")}:{" "}
        {formatCurrency(chomeshVal, defaultCurrency, i18n.language)}
      </span>
    </div>
  ) : undefined;

  return (
    <div className="w-full [&_.flex-1.flex-col>div:first-child]:sm:!text-center">
      <StatCard
        title={t("statsCards.overallRequired.title")}
        value={serverTitheBalance ?? null}
        isLoading={false}
        error={null}
        icon={Scale}
        colorScheme="blue"
        subtitleContent={subtitleContent}
        isSpecial={true}
        showAddButton={false}
      />
    </div>
  );
}
