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
type ColorScheme = "green" | "red" | "blue" | "purple" | "orange" | "yellow";

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
  isSpecial?: boolean; // Add special prop for enhanced styling
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
  yellow: {
    bg: "bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900",
    shadow: "hover:shadow-yellow-200/50 dark:hover:shadow-yellow-900/50",
    icon: "text-yellow-600 dark:text-yellow-400",
    text: "bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent dark:from-yellow-400 dark:to-amber-400",
    gradient: "rgba(234, 179, 8, 0.3)",
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
  isSpecial = false, // Default to false
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

  // Special styling for the overall required card
  const specialStyles = isSpecial
    ? {
        border: "border-2 border-blue-500 dark:border-blue-400",
        shadow:
          "shadow-lg hover:shadow-xl shadow-blue-500/20 dark:shadow-blue-400/20",
        bg: "bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-blue-950 dark:via-blue-900 dark:to-blue-800",
        ring: "ring-2 ring-blue-200 dark:ring-blue-800",
      }
    : {};

  return (
    <MagicStatCard
      className={`${isSpecial ? specialStyles.bg : styles.bg} ${
        isSpecial ? specialStyles.shadow : styles.shadow
      } ${isSpecial ? specialStyles.border : ""} ${
        isSpecial ? specialStyles.ring : ""
        // controls the card height
      } transition-all duration-300 h-[175px]`}
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
        <div className="text-right h-12">
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
          <div className="text-xs text-muted-foreground mt-1 text-right h-12">
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
