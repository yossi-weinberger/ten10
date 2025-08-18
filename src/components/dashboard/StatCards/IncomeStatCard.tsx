import React from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Wallet, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { User } from "@/contexts/AuthContext";
import CountUp from "react-countup";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { Platform } from "@/contexts/PlatformContext";
import { MagicStatCard } from "./MagicStatCard";
import { useDonationStore } from "@/lib/store";

interface IncomeStatCardProps {
  label: string | undefined;
  serverTotalIncome: number | null;
  isLoadingServerIncome: boolean;
  serverIncomeError: string | null;
  serverChomeshAmount: number | null;
  platform: string | undefined;
  user: User | null;
}

export function IncomeStatCard({
  label,
  serverTotalIncome,
  isLoadingServerIncome,
  serverIncomeError,
  serverChomeshAmount,
  platform,
  user,
}: IncomeStatCardProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );
  const {
    displayValue: incomeDisplayValue,
    startAnimateValue: incomeStartAnimateValue,
  } = useAnimatedCounter({
    serverValue: serverTotalIncome,
    isLoading: isLoadingServerIncome,
  });

  const {
    displayValue: chomeshDisplayValue,
    startAnimateValue: chomeshStartAnimateValue,
  } = useAnimatedCounter({
    serverValue: serverChomeshAmount,
    isLoading: isLoadingServerIncome,
  });

  return (
    <MagicStatCard
      className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 hover:shadow-green-200/50 dark:hover:shadow-green-900/50"
      gradientColor="rgba(34, 197, 94, 0.3)"
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          {t("statsCards.income.title")} ({label})
        </CardTitle>
        <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
      </CardHeader>
      <CardContent>
        <div className="text-right" style={{ minHeight: "calc(1.5rem * 1.5)" }}>
          {serverIncomeError ? (
            <p className="text-xs text-red-500">{t("monthlyChart.error")}</p>
          ) : platform === "web" &&
            !user &&
            serverTotalIncome === null &&
            !isLoadingServerIncome ? (
            <p className="text-xs text-orange-500">
              {t("monthlyChart.noData")}
            </p>
          ) : (
            <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent dark:from-green-400 dark:to-teal-400">
              <CountUp
                start={incomeStartAnimateValue}
                end={incomeDisplayValue}
                duration={0.75}
                decimals={2}
                formattingFn={(value) =>
                  formatCurrency(value, defaultCurrency, i18n.language)
                }
              />
            </span>
          )}
        </div>
        <p
          className="text-xs text-muted-foreground mt-1 text-right"
          style={{ minHeight: "1.2em" }}
        >
          {!isLoadingServerIncome &&
            !serverIncomeError &&
            typeof serverChomeshAmount === "number" &&
            serverChomeshAmount > 0 && (
              <span className="block text-xs text-muted-foreground">
                <CountUp
                  start={chomeshStartAnimateValue}
                  end={chomeshDisplayValue}
                  duration={0.75}
                  decimals={2}
                  formattingFn={(value) =>
                    formatCurrency(value, defaultCurrency, i18n.language)
                  }
                />{" "}
                {t("statsCards.income.withChomesh")}
              </span>
            )}
        </p>
      </CardContent>
      <CardFooter>
        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
      </CardFooter>
    </MagicStatCard>
  );
}
