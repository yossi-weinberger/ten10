import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import CountUp from "react-countup";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { MagicStatCard } from "./MagicStatCard";
import { useDonationStore } from "@/lib/store";

// Define a type for the color schemes for better type safety
type ColorScheme = "green" | "red" | "blue" | "purple" | "orange";

interface StatCardProps {
  title: string;
  value: number | null;
  isLoading: boolean;
  error: string | null;
  icon: LucideIcon;
  titleIcon?: LucideIcon;
  colorScheme: ColorScheme;
  footerContent?: React.ReactNode;
  subtitleContent?: React.ReactNode;
}

const colorStyles: Record<
  ColorScheme,
  {
    bg: string;
    shadow: string;
    icon: string;
    text: string;
    gradient: string;
  }
> = {
  green: {
    bg: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
    shadow: "hover:shadow-green-200/50 dark:hover:shadow-green-900/50",
    icon: "text-green-600 dark:text-green-400",
    text: "bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent dark:from-green-400 dark:to-teal-400",
    gradient: "rgba(34, 197, 94, 0.3)",
  },
  red: {
    bg: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900",
    shadow: "hover:shadow-red-200/50 dark:hover:shadow-red-900/50",
    icon: "text-red-600 dark:text-red-400",
    text: "bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent dark:from-red-400 dark:to-rose-400",
    gradient: "rgba(239, 68, 68, 0.3)",
  },
  blue: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
    shadow: "hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50",
    icon: "text-blue-600 dark:text-blue-400",
    text: "bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-sky-400",
    gradient: "rgba(59, 130, 246, 0.3)",
  },
  purple: {
    bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
    shadow: "hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50",
    icon: "text-purple-600 dark:text-purple-400",
    text: "bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-violet-400",
    gradient: "rgba(147, 51, 234, 0.3)",
  },
  orange: {
    bg: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900",
    shadow: "hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50",
    icon: "text-orange-600 dark:text-orange-400",
    text: "bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent dark:from-orange-400 dark:to-amber-400",
    gradient: "rgba(249, 115, 22, 0.3)",
  },
};

export function StatCard({
  title,
  value,
  isLoading,
  error,
  icon: Icon,
  titleIcon: TitleIcon,
  colorScheme,
  footerContent,
  subtitleContent,
}: StatCardProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );

  const { displayValue, startAnimateValue } = useAnimatedCounter({
    serverValue: value,
    isLoading,
  });

  const styles = colorStyles[colorScheme];

  return (
    <MagicStatCard
      className={`${styles.bg} ${styles.shadow}`}
      gradientColor={styles.gradient}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {TitleIcon && <TitleIcon className={`h-4 w-4 ${styles.icon}`} />}
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${styles.icon}`} />
      </CardHeader>
      <CardContent>
        <div className="text-right" style={{ minHeight: "calc(1.5rem * 1.5)" }}>
          {error ? (
            <p className="text-xs text-red-500">{t("monthlyChart.error")}</p>
          ) : (
            <span className={`text-3xl font-bold ${styles.text}`}>
              <CountUp
                start={startAnimateValue}
                end={displayValue}
                duration={0.75}
                decimals={2}
                formattingFn={(val) =>
                  formatCurrency(val, defaultCurrency, i18n.language)
                }
              />
            </span>
          )}
        </div>
        {subtitleContent && (
          <div
            className="text-xs text-muted-foreground mt-1 text-right"
            style={{ minHeight: "1.2em" }}
          >
            {subtitleContent}
          </div>
        )}
      </CardContent>
      {footerContent && (
        <CardFooter className="pt-2">{footerContent}</CardFooter>
      )}
    </MagicStatCard>
  );
}
