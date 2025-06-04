import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { User } from "@/contexts/AuthContext";
import CountUp from "react-countup";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

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
    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">
          סך ההכנסות ({label})
        </CardTitle>
        <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
      </CardHeader>
      <CardContent>
        <div className="text-right" style={{ minHeight: "calc(1.5rem * 1.5)" }}>
          {serverIncomeError ? (
            <p className="text-xs text-red-500">שגיאה</p>
          ) : platform === "web" &&
            !user &&
            serverTotalIncome === null &&
            !isLoadingServerIncome ? (
            <p className="text-xs text-orange-500">התחבר</p>
          ) : (
            <span className="text-2xl font-bold">
              <CountUp
                start={incomeStartAnimateValue}
                end={incomeDisplayValue}
                duration={0.75}
                decimals={2}
                formattingFn={formatCurrency}
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
                  formattingFn={formatCurrency}
                />{" "}
                מתוכם עם חומש
              </span>
            )}
        </p>
      </CardContent>
    </Card>
  );
}
